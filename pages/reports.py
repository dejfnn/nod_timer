"""Reports page for TimeFlow.

Provides Summary, Detailed, and Weekly report tabs with date range
picker, project/client/tag/billable filters, interactive charts,
and CSV/PDF export functionality.
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


def render() -> None:
    """Render the Reports page."""
    st.title("Reports")

    conn = get_connection()

    # ------------------------------------------------------------------
    # Date range picker with presets
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

    st.caption(f"Showing data from **{start_date}** to **{end_date}**")
    date_range_str = f"{start_date} to {end_date}"

    # ------------------------------------------------------------------
    # Filters
    # ------------------------------------------------------------------
    filters_parts: list[str] = []

    with st.expander("Filters", expanded=False):
        filter_col1, filter_col2 = st.columns(2)

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

        with filter_col2:
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
        ["Summary", "Detailed", "Weekly"]
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
                icon="📊",
                hint="Try adjusting the date range or removing some filters.",
            )
        else:
            # Chart
            fig = summary_horizontal_bar_chart(summary_df, group_col)
            st.plotly_chart(fig, use_container_width=True)

            # Table
            display_df = summary_df.copy()
            display_df["duration"] = display_df["total_seconds"].apply(format_duration)
            display_df["billable_amount"] = display_df["billable_amount"].apply(
                lambda v: f"${v:.2f}" if v > 0 else "-"
            )

            cols_to_show = [group_col, "entries_count", "duration", "billable_amount"]
            rename_map = {
                group_col: "Group",
                "entries_count": "Entries",
                "duration": "Total Duration",
                "billable_amount": "Billable Amount",
            }
            st.dataframe(
                display_df[cols_to_show].rename(columns=rename_map),
                use_container_width=True,
                hide_index=True,
            )

            # Grand total
            grand_seconds = int(summary_df["total_seconds"].sum())
            grand_billable = summary_df["billable_amount"].sum()
            grand_entries = int(summary_df["entries_count"].sum())
            st.markdown(
                f"**Grand Total:** {grand_entries} entries | "
                f"{format_duration(grand_seconds)} | "
                f"${grand_billable:.2f} billable"
            )

            # Export buttons
            st.divider()
            exp_col1, exp_col2 = st.columns(2)
            with exp_col1:
                csv_data = export_svc.dataframe_to_csv(
                    summary_df,
                    columns=[group_col, "entries_count", "total_seconds", "total_hours", "billable_amount"],
                    rename_map={
                        group_col: "Group",
                        "entries_count": "Entries",
                        "total_seconds": "Total Seconds",
                        "total_hours": "Total Hours",
                        "billable_amount": "Billable Amount",
                    },
                )
                st.download_button(
                    label="Download CSV",
                    data=csv_data,
                    file_name=f"summary_{group_by.lower()}_{start_str}_{end_str}.csv",
                    mime="text/csv",
                    key="summary_csv_download",
                )
            with exp_col2:
                pdf_data = export_svc.summary_report_to_pdf(
                    summary_df,
                    group_col=group_col,
                    title=f"Summary Report by {group_by}",
                    date_range=date_range_str,
                    filters_text=filters_text,
                )
                st.download_button(
                    label="Download PDF",
                    data=pdf_data,
                    file_name=f"summary_{group_by.lower()}_{start_str}_{end_str}.pdf",
                    mime="application/pdf",
                    key="summary_pdf_download",
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
                icon="📋",
                hint="Try adjusting the date range or removing some filters.",
            )
        else:
            # Subtotals per day
            subtotals = report_svc.detailed_day_subtotals(detail_df)

            # Display entries grouped by day
            for _, day_row in subtotals.iterrows():
                day = day_row["date"]
                day_total = format_duration(int(day_row["total_seconds"]))
                st.subheader(f"{day}  ({day_total})")

                day_entries = detail_df[detail_df["date"] == day].copy()

                display_cols = [
                    "description", "project_name", "client_name", "tags",
                    "start_time_display", "stop_time_display",
                    "duration_display", "billable",
                ]
                rename_map = {
                    "description": "Description",
                    "project_name": "Project",
                    "client_name": "Client",
                    "tags": "Tags",
                    "start_time_display": "Start",
                    "stop_time_display": "Stop",
                    "duration_display": "Duration",
                    "billable": "Billable",
                }
                st.dataframe(
                    day_entries[display_cols].rename(columns=rename_map),
                    use_container_width=True,
                    hide_index=True,
                )

            # Grand total
            grand_seconds = int(detail_df["duration_seconds"].sum())
            grand_billable = detail_df["billable_amount"].sum()
            st.markdown(
                f"**Grand Total:** {len(detail_df)} entries | "
                f"{format_duration(grand_seconds)} | "
                f"${grand_billable:.2f} billable"
            )

            # Export buttons
            st.divider()
            exp_col1, exp_col2 = st.columns(2)
            with exp_col1:
                csv_data = export_svc.dataframe_to_csv(
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
                )
                st.download_button(
                    label="Download CSV",
                    data=csv_data,
                    file_name=f"detailed_{start_str}_{end_str}.csv",
                    mime="text/csv",
                    key="detailed_csv_download",
                )
            with exp_col2:
                pdf_data = export_svc.detailed_report_to_pdf(
                    detail_df,
                    title="Detailed Report",
                    date_range=date_range_str,
                    filters_text=filters_text,
                )
                st.download_button(
                    label="Download PDF",
                    data=pdf_data,
                    file_name=f"detailed_{start_str}_{end_str}.pdf",
                    mime="application/pdf",
                    key="detailed_pdf_download",
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
                icon="📅",
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

            # Export button (CSV only for weekly - pivot table is tricky for PDF)
            st.divider()
            csv_data = export_svc.weekly_report_to_csv(weekly_df)
            st.download_button(
                label="Download CSV",
                data=csv_data,
                file_name=f"weekly_{start_str}_{end_str}.csv",
                mime="text/csv",
                key="weekly_csv_download",
            )
