"""Reports page for TimeFlow.

Provides Summary, Detailed, and Weekly report tabs with date range
picker, project/client/tag/billable filters, interactive charts,
and CSV/PDF export functionality.

Phase 3 upgrade: horizontal filter bar, styled date presets,
styled tabs, alternating-row tables with project indicators,
day-grouped detailed view, and icon-style export buttons.
"""

from datetime import datetime, timedelta

import pandas as pd
import streamlit as st

from db.connection import get_connection
from models import client as client_model
from models import project as project_model
from models import tag as tag_model
from services import export as export_svc
from services import reports as report_svc
from ui.charts import summary_horizontal_bar_chart, weekly_heatmap
from ui.components import empty_state
from ui.state import format_duration
from ui.styles import REPORTS_STYLES


def render() -> None:
    """Render the Reports page."""
    # Inject reports-specific styles
    st.markdown(REPORTS_STYLES, unsafe_allow_html=True)

    st.title("Reports")

    conn = get_connection()

    # ------------------------------------------------------------------
    # Date range picker with styled presets
    # ------------------------------------------------------------------
    today = datetime.now().date()
    monday = today - timedelta(days=today.weekday())

    preset = st.selectbox(
        "Date range",
        options=["Today", "This Week", "This Month", "Last Month", "Custom"],
        index=1,
        key="report_date_preset",
    )

    if preset == "Today":
        start_date = today
        end_date = today
    elif preset == "This Week":
        start_date = monday
        end_date = monday + timedelta(days=6)
    elif preset == "This Month":
        start_date = today.replace(day=1)
        if today.month == 12:
            end_date = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end_date = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    elif preset == "Last Month":
        first_this = today.replace(day=1)
        last_month_end = first_this - timedelta(days=1)
        start_date = last_month_end.replace(day=1)
        end_date = last_month_end
    else:  # Custom
        col_d1, col_d2 = st.columns(2)
        with col_d1:
            start_date = st.date_input("Start date", value=monday, key="report_start")
        with col_d2:
            end_date = st.date_input("End date", value=today, key="report_end")

    st.markdown(
        f'<div class="tf-date-range-info">'
        f'\U0001f4c5 Showing data from <strong>{start_date}</strong> '
        f'to <strong>{end_date}</strong>'
        f'</div>',
        unsafe_allow_html=True,
    )
    date_range_str = f"{start_date} to {end_date}"

    # ------------------------------------------------------------------
    # Filters — horizontal layout in a styled card
    # ------------------------------------------------------------------
    filters_parts: list[str] = []

    with st.expander("Filters", expanded=False):
        filter_col1, filter_col2, filter_col3, filter_col4 = st.columns(4)

        with filter_col1:
            # Project filter
            all_projects = project_model.get_all(include_archived=True, conn=conn)
            project_options = {p.name: p.id for p in all_projects}
            selected_project_names = st.multiselect(
                "Projects",
                options=list(project_options.keys()),
                key="report_projects",
            )
            project_ids = (
                [project_options[n] for n in selected_project_names]
                if selected_project_names else None
            )
            if selected_project_names:
                filters_parts.append(f"Projects: {', '.join(selected_project_names)}")

        with filter_col2:
            # Client filter
            all_clients = client_model.get_all(include_archived=True, conn=conn)
            client_options = {c.name: c.id for c in all_clients}
            selected_client_names = st.multiselect(
                "Clients",
                options=list(client_options.keys()),
                key="report_clients",
            )
            client_ids = (
                [client_options[n] for n in selected_client_names]
                if selected_client_names else None
            )
            if selected_client_names:
                filters_parts.append(f"Clients: {', '.join(selected_client_names)}")

        with filter_col3:
            # Tag filter
            all_tags = tag_model.get_all(conn=conn)
            tag_options = {t.name: t.id for t in all_tags}
            selected_tag_names = st.multiselect(
                "Tags",
                options=list(tag_options.keys()),
                key="report_tags",
            )
            tag_ids = (
                [tag_options[n] for n in selected_tag_names]
                if selected_tag_names else None
            )
            if selected_tag_names:
                filters_parts.append(f"Tags: {', '.join(selected_tag_names)}")

        with filter_col4:
            # Billable filter
            billable_option = st.selectbox(
                "Billable",
                options=["All", "Billable only", "Non-billable only"],
                index=0,
                key="report_billable",
            )
            billable: bool | None = None
            if billable_option == "Billable only":
                billable = True
                filters_parts.append("Billable only")
            elif billable_option == "Non-billable only":
                billable = False
                filters_parts.append("Non-billable only")

    filters_text = "; ".join(filters_parts) if filters_parts else "None"
    start_str = start_date.isoformat()
    end_str = end_date.isoformat()

    # ------------------------------------------------------------------
    # Report tabs
    # ------------------------------------------------------------------
    tab_summary, tab_detailed, tab_weekly = st.tabs(
        ["\U0001f4ca Summary", "\U0001f4cb Detailed", "\U0001f4c5 Weekly"]
    )

    # ==================================================================
    # Summary tab
    # ==================================================================
    with tab_summary:
        group_by = st.radio(
            "Group by",
            options=["Project", "Client", "Day"],
            horizontal=True,
            key="summary_group_by",
        )

        with st.spinner("Generating summary report..."):
            if group_by == "Project":
                summary_df = report_svc.summary_by_project(
                    conn, start_str, end_str,
                    project_ids=project_ids, client_ids=client_ids,
                    tag_ids=tag_ids, billable=billable,
                )
                group_col = "project_name"
            elif group_by == "Client":
                summary_df = report_svc.summary_by_client(
                    conn, start_str, end_str,
                    project_ids=project_ids, client_ids=client_ids,
                    tag_ids=tag_ids, billable=billable,
                )
                group_col = "client_name"
            else:
                summary_df = report_svc.summary_by_day(
                    conn, start_str, end_str,
                    project_ids=project_ids, client_ids=client_ids,
                    tag_ids=tag_ids, billable=billable,
                )
                group_col = "date"

        if summary_df.empty:
            empty_state(
                "No entries found for the selected date range and filters.",
                icon="\U0001f4ca",
                hint="Try adjusting the date range or removing some filters.",
            )
        else:
            # Chart
            fig = summary_horizontal_bar_chart(summary_df, group_col)
            st.plotly_chart(fig, use_container_width=True)

            # Styled HTML table with alternating rows and project color dots
            _render_summary_table(summary_df, group_col)

            # Grand total bar
            grand_seconds = int(summary_df["total_seconds"].sum())
            grand_billable = summary_df["billable_amount"].sum()
            grand_entries = int(summary_df["entries_count"].sum())
            _render_grand_total(grand_entries, grand_seconds, grand_billable)

            # Export buttons as icon buttons
            _render_export_buttons(
                csv_data=export_svc.dataframe_to_csv(
                    summary_df,
                    columns=[group_col, "entries_count", "total_seconds", "total_hours", "billable_amount"],
                    rename_map={
                        group_col: "Group",
                        "entries_count": "Entries",
                        "total_seconds": "Total Seconds",
                        "total_hours": "Total Hours",
                        "billable_amount": "Billable Amount",
                    },
                ),
                pdf_data=export_svc.summary_report_to_pdf(
                    summary_df,
                    group_col=group_col,
                    title=f"Summary Report by {group_by}",
                    date_range=date_range_str,
                    filters_text=filters_text,
                ),
                csv_filename=f"summary_{group_by.lower()}_{start_str}_{end_str}.csv",
                pdf_filename=f"summary_{group_by.lower()}_{start_str}_{end_str}.pdf",
                key_prefix="summary",
            )

    # ==================================================================
    # Detailed tab
    # ==================================================================
    with tab_detailed:
        with st.spinner("Generating detailed report..."):
            detail_df = report_svc.detailed_report(
                conn, start_str, end_str,
                project_ids=project_ids, client_ids=client_ids,
                tag_ids=tag_ids, billable=billable,
            )

        if detail_df.empty:
            empty_state(
                "No entries found for the selected date range and filters.",
                icon="\U0001f4cb",
                hint="Try adjusting the date range or removing some filters.",
            )
        else:
            # Subtotals per day
            subtotals = report_svc.detailed_day_subtotals(detail_df)

            # Display entries grouped by day with styled day headers
            for _, day_row in subtotals.iterrows():
                day = day_row["date"]
                day_total = format_duration(int(day_row["total_seconds"]))

                # Parse date for day-of-week display
                try:
                    day_dt = datetime.strptime(day, "%Y-%m-%d")
                    day_name = day_dt.strftime("%A")
                except ValueError:
                    day_name = ""

                # Styled day header
                st.markdown(
                    f"""
                    <div class="tf-day-header">
                        <div>
                            <span class="day-date">{day}</span>
                            <span class="day-name">{day_name}</span>
                        </div>
                        <span class="day-total">{day_total}</span>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

                # Day entries as styled table
                day_entries = detail_df[detail_df["date"] == day].copy()
                _render_detailed_table(day_entries)

            # Grand total
            grand_seconds = int(detail_df["duration_seconds"].sum())
            grand_billable = detail_df["billable_amount"].sum()
            grand_entries = len(detail_df)
            _render_grand_total(grand_entries, grand_seconds, grand_billable)

            # Export buttons
            _render_export_buttons(
                csv_data=export_svc.dataframe_to_csv(
                    detail_df,
                    columns=[
                        "date", "description", "project_name", "client_name",
                        "tags", "start_time_display", "stop_time_display",
                        "duration_display", "billable",
                    ],
                    rename_map={
                        "date": "Date",
                        "description": "Description",
                        "project_name": "Project",
                        "client_name": "Client",
                        "tags": "Tags",
                        "start_time_display": "Start",
                        "stop_time_display": "Stop",
                        "duration_display": "Duration",
                        "billable": "Billable",
                    },
                ),
                pdf_data=export_svc.detailed_report_to_pdf(
                    detail_df,
                    title="Detailed Report",
                    date_range=date_range_str,
                    filters_text=filters_text,
                ),
                csv_filename=f"detailed_{start_str}_{end_str}.csv",
                pdf_filename=f"detailed_{start_str}_{end_str}.pdf",
                key_prefix="detailed",
            )

    # ==================================================================
    # Weekly tab
    # ==================================================================
    with tab_weekly:
        with st.spinner("Generating weekly report..."):
            weekly_df = report_svc.weekly_report(
                conn, start_str, end_str,
                project_ids=project_ids, client_ids=client_ids,
                tag_ids=tag_ids, billable=billable,
            )

        if weekly_df.empty:
            empty_state(
                "No entries found for the selected date range and filters.",
                icon="\U0001f4c5",
                hint="Try adjusting the date range or removing some filters.",
            )
        else:
            # Heatmap chart
            fig = weekly_heatmap(weekly_df)
            st.plotly_chart(fig, use_container_width=True)

            # Table with formatted hours
            day_cols = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            display_weekly = weekly_df.copy()
            for col in day_cols + ["Total"]:
                display_weekly[col] = display_weekly[col].apply(
                    lambda v: f"{v:.1f}h" if v > 0 else "-"
                )
            display_weekly = display_weekly.rename(columns={"project_name": "Project"})

            st.dataframe(
                display_weekly,
                use_container_width=True,
                hide_index=True,
            )

            # Export button (CSV only for weekly)
            st.markdown('<div class="tf-export-bar">', unsafe_allow_html=True)
            csv_data = export_svc.weekly_report_to_csv(weekly_df)
            col_csv, _ = st.columns([1, 3])
            with col_csv:
                st.markdown('<div class="tf-export-btn">', unsafe_allow_html=True)
                st.download_button(
                    label="\U0001f4e5 CSV",
                    data=csv_data,
                    file_name=f"weekly_{start_str}_{end_str}.csv",
                    mime="text/csv",
                    key="weekly_csv_download",
                )
                st.markdown('</div>', unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Helper: render styled summary table
# ---------------------------------------------------------------------------
def _render_summary_table(df: pd.DataFrame, group_col: str) -> None:
    """Render the summary report as a styled HTML table.

    Features alternating row backgrounds and project color dots inline
    when grouped by project.

    Args:
        df: Summary DataFrame.
        group_col: Column used for grouping (project_name, client_name, date).
    """
    has_color = "project_color" in df.columns

    header_labels = {
        "group": "Group",
        "entries": "Entries",
        "duration": "Duration",
        "billable": "Billable",
    }

    rows_html = ""
    for _, row in df.iterrows():
        group_val = row[group_col]
        entries = int(row["entries_count"])
        duration = format_duration(int(row["total_seconds"]))
        billable_val = row["billable_amount"]
        billable_str = f"${billable_val:.2f}" if billable_val > 0 else "-"

        # Project color dot for project grouping
        if has_color:
            color = row["project_color"]
            group_cell = (
                f'<span class="project-indicator">'
                f'<span class="dot" style="background: {color};"></span>'
                f'{group_val}</span>'
            )
        else:
            group_cell = group_val

        rows_html += f"""
            <tr>
                <td>{group_cell}</td>
                <td class="td-number">{entries}</td>
                <td class="td-number">{duration}</td>
                <td class="td-number">{billable_str}</td>
            </tr>
        """

    st.markdown(
        f"""
        <table class="tf-report-table">
            <thead>
                <tr>
                    <th>{header_labels['group']}</th>
                    <th style="text-align: right;">{header_labels['entries']}</th>
                    <th style="text-align: right;">{header_labels['duration']}</th>
                    <th style="text-align: right;">{header_labels['billable']}</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
        """,
        unsafe_allow_html=True,
    )


# ---------------------------------------------------------------------------
# Helper: render detailed day entries table
# ---------------------------------------------------------------------------
def _render_detailed_table(day_entries: pd.DataFrame) -> None:
    """Render detailed entries for a single day as a styled HTML table.

    Args:
        day_entries: DataFrame of entries for one day.
    """
    rows_html = ""
    for _, entry in day_entries.iterrows():
        desc = entry["description"]
        project = entry["project_name"]
        project_color = entry.get("project_color", "#888888") if "project_color" in entry.index else "#888888"
        tags = entry["tags"] if entry["tags"] else ""
        start = entry["start_time_display"]
        stop = entry["stop_time_display"]
        duration = entry["duration_display"]
        is_billable = entry["billable"]

        project_cell = (
            f'<span class="project-indicator">'
            f'<span class="dot" style="background: {project_color};"></span>'
            f'{project}</span>'
        )

        billable_indicator = "\u2705" if is_billable else ""
        tags_display = f'<span style="font-size:0.78rem;color:#9aa0b0;">{tags}</span>' if tags else ""

        rows_html += f"""
            <tr>
                <td>{desc}{' ' + tags_display if tags_display else ''}</td>
                <td>{project_cell}</td>
                <td class="td-number">{start} &ndash; {stop}</td>
                <td class="td-number">{duration}</td>
                <td style="text-align:center;">{billable_indicator}</td>
            </tr>
        """

    st.markdown(
        f"""
        <table class="tf-report-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Project</th>
                    <th style="text-align: right;">Time</th>
                    <th style="text-align: right;">Duration</th>
                    <th style="text-align: center;">$</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
        """,
        unsafe_allow_html=True,
    )


# ---------------------------------------------------------------------------
# Helper: render grand total bar
# ---------------------------------------------------------------------------
def _render_grand_total(entries: int, total_seconds: int, billable: float) -> None:
    """Render a styled grand total bar.

    Args:
        entries: Total number of entries.
        total_seconds: Total duration in seconds.
        billable: Total billable amount.
    """
    st.markdown(
        f"""
        <div class="tf-grand-total">
            <span class="total-label">Grand Total</span>
            <div class="total-stats">
                <div class="stat-item">
                    <div class="stat-value">{entries}</div>
                    <div class="stat-label">entries</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{format_duration(total_seconds)}</div>
                    <div class="stat-label">duration</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${billable:.2f}</div>
                    <div class="stat-label">billable</div>
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


# ---------------------------------------------------------------------------
# Helper: render export buttons as icon buttons
# ---------------------------------------------------------------------------
def _render_export_buttons(
    csv_data: str | bytes,
    pdf_data: bytes,
    csv_filename: str,
    pdf_filename: str,
    key_prefix: str,
) -> None:
    """Render styled CSV and PDF export buttons in a row.

    Args:
        csv_data: CSV file content.
        pdf_data: PDF file content.
        csv_filename: Filename for CSV download.
        pdf_filename: Filename for PDF download.
        key_prefix: Unique prefix for Streamlit widget keys.
    """
    st.markdown('<div class="tf-export-bar">', unsafe_allow_html=True)
    exp_col1, exp_col2, _ = st.columns([1, 1, 2])
    with exp_col1:
        st.markdown('<div class="tf-export-btn">', unsafe_allow_html=True)
        st.download_button(
            label="\U0001f4e5 CSV",
            data=csv_data,
            file_name=csv_filename,
            mime="text/csv",
            key=f"{key_prefix}_csv_download",
        )
        st.markdown('</div>', unsafe_allow_html=True)
    with exp_col2:
        st.markdown('<div class="tf-export-btn">', unsafe_allow_html=True)
        st.download_button(
            label="\U0001f4c4 PDF",
            data=pdf_data,
            file_name=pdf_filename,
            mime="application/pdf",
            key=f"{key_prefix}_pdf_download",
        )
        st.markdown('</div>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
