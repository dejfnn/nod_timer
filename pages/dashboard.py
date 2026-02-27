"""Dashboard page for TimeFlow.

Shows overview metrics, charts, and recent activity.
"""

import streamlit as st

from db.connection import get_connection
from services import dashboard as dashboard_svc
from ui.charts import daily_bar_chart, project_donut_chart
from ui.state import format_duration


def render() -> None:
    """Render the Dashboard page."""
    st.title("Dashboard")

    conn = get_connection()

    # ------------------------------------------------------------------
    # Top row: metric cards (today / week / month)
    # ------------------------------------------------------------------
    today_total = dashboard_svc.get_today_total(conn)
    week_total = dashboard_svc.get_week_total(conn)
    month_total = dashboard_svc.get_month_total(conn)

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric(
            label="Today",
            value=format_duration(today_total),
            help=f"{today_total / 3600:.2f} hours",
        )
    with col2:
        st.metric(
            label="This Week",
            value=format_duration(week_total),
            help=f"{week_total / 3600:.2f} hours",
        )
    with col3:
        st.metric(
            label="This Month",
            value=format_duration(month_total),
            help=f"{month_total / 3600:.2f} hours",
        )

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
        st.subheader("Most Tracked This Week")
        most_tracked = dashboard_svc.get_most_tracked_project(conn)
        if most_tracked is not None:
            st.markdown(
                f"""
                <div style="padding: 12px; border-radius: 8px;
                            border-left: 4px solid {most_tracked['color']};">
                    <strong style="font-size: 1.2rem;">{most_tracked['project_name']}</strong><br>
                    <span style="font-size: 1.5rem; font-weight: bold;">
                        {most_tracked['hours']:.1f}h
                    </span>
                </div>
                """,
                unsafe_allow_html=True,
            )
        else:
            st.info("No tracked time this week.")

    with bottom_col2:
        st.subheader("Recent Entries")
        recent = dashboard_svc.get_recent_entries(conn, limit=5)
        if recent:
            for entry in recent:
                duration_str = format_duration(entry["duration_seconds"])
                c1, c2, c3 = st.columns([3, 2, 1])
                with c1:
                    st.markdown(f"**{entry['description']}**")
                with c2:
                    st.markdown(
                        f'<span style="display:inline-flex;align-items:center;gap:4px;">'
                        f'<span style="width:8px;height:8px;border-radius:50%;'
                        f'background:{entry["project_color"]};display:inline-block;"></span>'
                        f'{entry["project_name"]}</span>',
                        unsafe_allow_html=True,
                    )
                with c3:
                    st.text(duration_str)
        else:
            st.info("No entries yet. Start tracking time!")
