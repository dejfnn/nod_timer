"""CSV and PDF export functions for TimeFlow reports.

Pure functions (no Streamlit dependency) for testability.
Uses pandas for CSV and fpdf2 for PDF generation.
"""

import io
from datetime import datetime

import pandas as pd
from fpdf import FPDF


def dataframe_to_csv(
    df: pd.DataFrame,
    columns: list[str] | None = None,
    rename_map: dict[str, str] | None = None,
) -> str:
    """Convert a pandas DataFrame to a CSV string.

    Args:
        df: The DataFrame to export.
        columns: Optional list of column names to include. If None, all columns.
        rename_map: Optional mapping of column names to display names.

    Returns:
        CSV content as a string.
    """
    export_df = df.copy()

    if columns:
        available = [c for c in columns if c in export_df.columns]
        export_df = export_df[available]

    if rename_map:
        export_df = export_df.rename(columns=rename_map)

    return export_df.to_csv(index=False)


def summary_report_to_pdf(
    df: pd.DataFrame,
    group_col: str,
    title: str = "Summary Report",
    date_range: str = "",
    filters_text: str = "",
) -> bytes:
    """Generate a PDF for a summary report.

    Args:
        df: Summary DataFrame with columns: group_col, entries_count,
            total_seconds, total_hours, billable_amount.
        group_col: The column name for the group (project_name, client_name, date).
        title: Report title.
        date_range: Human-readable date range string (e.g. "2025-06-15 to 2025-06-21").
        filters_text: Description of active filters.

    Returns:
        PDF content as bytes.
    """
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Title
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(4)

    # Subtitle: date range
    if date_range:
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, f"Period: {date_range}", new_x="LMARGIN", new_y="NEXT", align="C")

    # Filters
    if filters_text:
        pdf.set_font("Helvetica", "I", 9)
        pdf.cell(0, 6, f"Filters: {filters_text}", new_x="LMARGIN", new_y="NEXT", align="C")

    pdf.ln(6)

    # Generated at
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(
        0, 5,
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        new_x="LMARGIN", new_y="NEXT", align="R",
    )
    pdf.ln(4)

    if df.empty:
        pdf.set_font("Helvetica", "I", 11)
        pdf.cell(0, 10, "No data for the selected period.", new_x="LMARGIN", new_y="NEXT")
        return bytes(pdf.output())

    # Table header
    col_widths = [60, 25, 40, 30, 35]
    headers = ["Group", "Entries", "Duration", "Hours", "Billable"]

    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(70, 130, 180)
    pdf.set_text_color(255, 255, 255)
    for i, header in enumerate(headers):
        pdf.cell(col_widths[i], 8, header, border=1, fill=True, align="C")
    pdf.ln()

    # Table rows
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(0, 0, 0)

    for _, row in df.iterrows():
        group_value = str(row.get(group_col, ""))
        entries_count = str(int(row.get("entries_count", 0)))
        total_seconds = int(row.get("total_seconds", 0))
        total_hours = row.get("total_hours", 0.0)
        billable_amount = row.get("billable_amount", 0.0)

        # Format duration
        h = total_seconds // 3600
        m = (total_seconds % 3600) // 60
        s = total_seconds % 60
        duration_str = f"{h:02d}:{m:02d}:{s:02d}"

        hours_str = f"{total_hours:.2f}h"
        billable_str = f"${billable_amount:.2f}" if billable_amount > 0 else "-"

        # Truncate group name if too long
        if len(group_value) > 25:
            group_value = group_value[:22] + "..."

        pdf.cell(col_widths[0], 7, group_value, border=1)
        pdf.cell(col_widths[1], 7, entries_count, border=1, align="C")
        pdf.cell(col_widths[2], 7, duration_str, border=1, align="C")
        pdf.cell(col_widths[3], 7, hours_str, border=1, align="R")
        pdf.cell(col_widths[4], 7, billable_str, border=1, align="R")
        pdf.ln()

    # Grand total row
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(230, 230, 230)

    grand_entries = int(df["entries_count"].sum())
    grand_seconds = int(df["total_seconds"].sum())
    grand_hours = df["total_hours"].sum()
    grand_billable = df["billable_amount"].sum()

    gh = grand_seconds // 3600
    gm = (grand_seconds % 3600) // 60
    gs = grand_seconds % 60
    grand_dur = f"{gh:02d}:{gm:02d}:{gs:02d}"

    pdf.cell(col_widths[0], 8, "TOTAL", border=1, fill=True)
    pdf.cell(col_widths[1], 8, str(grand_entries), border=1, align="C", fill=True)
    pdf.cell(col_widths[2], 8, grand_dur, border=1, align="C", fill=True)
    pdf.cell(col_widths[3], 8, f"{grand_hours:.2f}h", border=1, align="R", fill=True)
    pdf.cell(col_widths[4], 8, f"${grand_billable:.2f}", border=1, align="R", fill=True)
    pdf.ln()

    return bytes(pdf.output())


def detailed_report_to_pdf(
    df: pd.DataFrame,
    title: str = "Detailed Report",
    date_range: str = "",
    filters_text: str = "",
) -> bytes:
    """Generate a PDF for a detailed report.

    Args:
        df: Detailed DataFrame with columns: date, description, project_name,
            duration_display, billable.
        title: Report title.
        date_range: Human-readable date range.
        filters_text: Active filters description.

    Returns:
        PDF content as bytes.
    """
    pdf = FPDF()
    pdf.add_page("L")  # Landscape for more columns
    pdf.set_auto_page_break(auto=True, margin=15)

    # Title
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(4)

    if date_range:
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, f"Period: {date_range}", new_x="LMARGIN", new_y="NEXT", align="C")

    if filters_text:
        pdf.set_font("Helvetica", "I", 9)
        pdf.cell(0, 6, f"Filters: {filters_text}", new_x="LMARGIN", new_y="NEXT", align="C")

    pdf.ln(4)

    pdf.set_font("Helvetica", "", 8)
    pdf.cell(
        0, 5,
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        new_x="LMARGIN", new_y="NEXT", align="R",
    )
    pdf.ln(4)

    if df.empty:
        pdf.set_font("Helvetica", "I", 11)
        pdf.cell(0, 10, "No data for the selected period.", new_x="LMARGIN", new_y="NEXT")
        return bytes(pdf.output())

    # Table header
    col_widths = [25, 70, 40, 30, 25, 25, 30, 20]
    headers = ["Date", "Description", "Project", "Client", "Start", "Stop", "Duration", "Bill"]

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(70, 130, 180)
    pdf.set_text_color(255, 255, 255)
    for i, header in enumerate(headers):
        pdf.cell(col_widths[i], 8, header, border=1, fill=True, align="C")
    pdf.ln()

    # Table rows
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(0, 0, 0)

    current_date = None
    for _, row in df.iterrows():
        date_val = str(row.get("date", ""))
        desc = str(row.get("description", ""))[:30]
        project = str(row.get("project_name", ""))[:18]
        client = str(row.get("client_name", ""))[:14]
        start = str(row.get("start_time_display", ""))
        stop = str(row.get("stop_time_display", ""))
        duration = str(row.get("duration_display", ""))
        billable = "Yes" if row.get("billable") else "No"

        # Day separator
        if date_val != current_date:
            current_date = date_val

        pdf.cell(col_widths[0], 6, date_val, border=1)
        pdf.cell(col_widths[1], 6, desc, border=1)
        pdf.cell(col_widths[2], 6, project, border=1)
        pdf.cell(col_widths[3], 6, client, border=1)
        pdf.cell(col_widths[4], 6, start, border=1, align="C")
        pdf.cell(col_widths[5], 6, stop, border=1, align="C")
        pdf.cell(col_widths[6], 6, duration, border=1, align="C")
        pdf.cell(col_widths[7], 6, billable, border=1, align="C")
        pdf.ln()

    # Grand total
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(230, 230, 230)
    grand_seconds = int(df["duration_seconds"].sum())
    gh = grand_seconds // 3600
    gm = (grand_seconds % 3600) // 60
    gs = grand_seconds % 60
    grand_dur = f"{gh:02d}:{gm:02d}:{gs:02d}"

    total_width = sum(col_widths[:6])
    pdf.cell(total_width, 8, f"TOTAL: {len(df)} entries", border=1, fill=True)
    pdf.cell(col_widths[6], 8, grand_dur, border=1, align="C", fill=True)
    pdf.cell(col_widths[7], 8, "", border=1, fill=True)
    pdf.ln()

    return bytes(pdf.output())


def weekly_report_to_csv(df: pd.DataFrame) -> str:
    """Convert a weekly report DataFrame to CSV.

    Args:
        df: Weekly report DataFrame with project_name, day columns, Total.

    Returns:
        CSV content as a string.
    """
    return df.to_csv(index=False)
