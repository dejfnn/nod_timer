"""Dashboard page for TimeFlow.

Shows overview metrics in styled cards, dark-themed charts,
daily capacity bar, most-tracked project, and recent activity.
"""

import streamlit as st

from db.connection import get_connection
from models import settings as settings_model
from services import dashboard as dashboard_svc
from ui.charts import daily_bar_chart, project_donut_chart
from ui.components import capacity_bar, empty_state
from ui.state import format_duration
from ui.styles import DASHBOARD_STYLES


def render() -> None:
    """Render the Dashboard page."""
    # Inject dashboard-specific styles
    st.markdown(DASHBOARD_STYLES, unsafe_allow_html=True)

    st.title("Dashboard")

    conn = get_connection()

    # ------------------------------------------------------------------
    # Top row: metric cards (today / week / month) with gradient borders
    # ------------------------------------------------------------------
    today_total = dashboard_svc.get_today_total(conn)
    week_total = dashboard_svc.get_week_total(conn)
    month_total = dashboard_svc.get_month_total(conn)

    col1, col2, col3 = st.columns(3)

    with col1:
        _metric_card(
            icon="\U0001f4c5",
            label="Today",
            value=format_duration(today_total),
            help_text=f"{today_total / 3600:.2f} hours",
            color_class="blue",
        )

    with col2:
        _metric_card(
            icon="\U0001f4c8",
            label="This Week",
            value=format_duration(week_total),
            help_text=f"{week_total / 3600:.2f} hours",
            color_class="teal",
        )

    with col3:
        _metric_card(
            icon="\U0001f4ca",
            label="This Month",
            value=format_duration(month_total),
            help_text=f"{month_total / 3600:.2f} hours",
            color_class="purple",
        )

    # ------------------------------------------------------------------
    # Capacity bar: today's tracked time vs working hours
    # ------------------------------------------------------------------
    working_hours = settings_model.get_working_hours(conn=conn)
    capacity_pct = settings_model.calculate_capacity_percent(today_total, working_hours)

    st.markdown(
        f"""
        <div class="tf-capacity-label">
            Today's capacity: <strong>{capacity_pct:.0f}%</strong>
            ({today_total / 3600:.1f}h / {working_hours:.1f}h)
        </div>
        """,
        unsafe_allow_html=True,
    )
    capacity_bar(capacity_pct)

    st.divider()

    # ------------------------------------------------------------------
    # Charts row: bar chart (last 7 days) + donut chart (project dist.)
    # ------------------------------------------------------------------
    chart_col1, chart_col2 = st.columns(2)

    with chart_col1:
        last7 = dashboard_svc.get_last_7_days(conn)
        fig_bar = daily_bar_chart(last7)
        st.plotly_chart(fig_bar, use_container_width=True)

    with chart_col2:
        proj_dist = dashboard_svc.get_project_distribution(conn)
        fig_donut = project_donut_chart(proj_dist)
        st.plotly_chart(fig_donut, use_container_width=True)

    st.divider()

    # ------------------------------------------------------------------
    # Bottom row: most tracked project + recent entries
    # ------------------------------------------------------------------
    bottom_col1, bottom_col2 = st.columns([1, 2])

    with bottom_col1:
        st.markdown(
            '<div class="tf-section-header">Most Tracked This Week</div>',
            unsafe_allow_html=True,
        )
        most_tracked = dashboard_svc.get_most_tracked_project(conn)
        if most_tracked is not None:
            st.markdown(
                f"""
                <div class="tf-most-tracked" style="border-left: 4px solid {most_tracked['color']};">
                    <div class="project-name">
                        <span class="accent-dot" style="background: {most_tracked['color']};"></span>
                        {most_tracked['project_name']}
                    </div>
                    <div class="hours-display">{most_tracked['hours']:.1f}h</div>
                    <div class="hours-label">tracked this week</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        else:
            empty_state(
                "No tracked time this week.",
                icon="\U0001f4ca",
                hint="Start the timer to see your most tracked project here.",
            )

    with bottom_col2:
        st.markdown(
            '<div class="tf-section-header">Recent Entries</div>',
            unsafe_allow_html=True,
        )
        recent = dashboard_svc.get_recent_entries(conn, limit=5)
        if recent:
            for entry in recent:
                duration_str = format_duration(entry["duration_seconds"])
                st.markdown(
                    f"""
                    <div class="tf-recent-entry">
                        <span class="project-dot"
                              style="background: {entry['project_color']};"></span>
                        <span class="entry-desc">{entry['description']}</span>
                        <span class="entry-time">{duration_str}</span>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
        else:
            empty_state(
                "No entries yet.",
                icon="\u23f1\ufe0f",
                hint="Start tracking time to see your recent entries here!",
            )


def _metric_card(
    icon: str,
    label: str,
    value: str,
    help_text: str,
    color_class: str,
) -> None:
    """Render a styled metric card with gradient top border.

    Args:
        icon: Emoji icon for the card.
        label: Metric label (e.g. "Today").
        value: Formatted metric value.
        help_text: Subtle help text below the value.
        color_class: CSS class for gradient color ('blue', 'teal', 'purple').
    """
    st.markdown(
        f"""
        <div class="tf-metric-card {color_class}">
            <div class="tf-metric-label">
                <span class="icon">{icon}</span> {label}
            </div>
            <div class="tf-metric-value">{value}</div>
            <div class="tf-metric-help">{help_text}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
