"""Plotly chart builder functions for TimeFlow.

Each function takes data (usually a pandas DataFrame) and returns
a plotly Figure object ready for display with st.plotly_chart().
"""

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go


def daily_bar_chart(df: pd.DataFrame) -> go.Figure:
    """Create a bar chart of hours per day.

    Args:
        df: DataFrame with columns ``date`` (str) and ``hours`` (float).

    Returns:
        Plotly Figure.
    """
    if df.empty:
        fig = go.Figure()
        fig.update_layout(
            title="Daily Tracked Time",
            annotations=[{
                "text": "No data to display",
                "xref": "paper",
                "yref": "paper",
                "showarrow": False,
                "font": {"size": 16, "color": "#888"},
                "x": 0.5,
                "y": 0.5,
            }],
        )
        return fig

    # Format date labels as short day names
    df = df.copy()
    df["label"] = pd.to_datetime(df["date"]).dt.strftime("%a %m/%d")

    fig = px.bar(
        df,
        x="label",
        y="hours",
        color_discrete_sequence=["#4A90D9"],
        labels={"label": "Day", "hours": "Hours"},
    )
    fig.update_layout(
        title="Last 7 Days",
        xaxis_title="",
        yaxis_title="Hours",
        showlegend=False,
        hovermode="x unified",
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        font={"color": "#ccc"},
        margin={"t": 40, "b": 40, "l": 40, "r": 20},
    )
    fig.update_traces(
        hovertemplate="%{y:.2f}h<extra></extra>",
    )
    return fig


def project_donut_chart(df: pd.DataFrame) -> go.Figure:
    """Create a donut chart of project time distribution.

    Args:
        df: DataFrame with columns ``project_name``, ``hours``, ``color``.

    Returns:
        Plotly Figure.
    """
    if df.empty:
        fig = go.Figure()
        fig.update_layout(
            title="Project Distribution",
            annotations=[{
                "text": "No data to display",
                "xref": "paper",
                "yref": "paper",
                "showarrow": False,
                "font": {"size": 16, "color": "#888"},
                "x": 0.5,
                "y": 0.5,
            }],
        )
        return fig

    colors = df["color"].tolist()

    fig = go.Figure(data=[go.Pie(
        labels=df["project_name"],
        values=df["hours"],
        hole=0.4,
        marker={"colors": colors},
        textinfo="label+percent",
        hovertemplate="%{label}: %{value:.2f}h (%{percent})<extra></extra>",
    )])
    fig.update_layout(
        title="Project Distribution (This Week)",
        showlegend=True,
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        font={"color": "#ccc"},
        margin={"t": 40, "b": 20, "l": 20, "r": 20},
    )
    return fig


def summary_horizontal_bar_chart(
    df: pd.DataFrame,
    group_col: str,
    value_col: str = "total_hours",
) -> go.Figure:
    """Create a horizontal bar chart for summary reports.

    Args:
        df: DataFrame with at least ``group_col`` and ``value_col`` columns.
        group_col: Column name for group labels.
        value_col: Column name for bar values (hours).

    Returns:
        Plotly Figure.
    """
    if df.empty:
        fig = go.Figure()
        fig.update_layout(
            title="Summary",
            annotations=[{
                "text": "No data to display",
                "xref": "paper",
                "yref": "paper",
                "showarrow": False,
                "font": {"size": 16, "color": "#888"},
                "x": 0.5,
                "y": 0.5,
            }],
        )
        return fig

    plot_df = df.sort_values(value_col, ascending=True).copy()

    # Use project colors if available
    colors = None
    if "project_color" in plot_df.columns:
        colors = plot_df["project_color"].tolist()

    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=plot_df[value_col],
        y=plot_df[group_col],
        orientation="h",
        marker_color=colors if colors else "#4A90D9",
        hovertemplate="%{y}: %{x:.2f}h<extra></extra>",
    ))

    fig.update_layout(
        title="Hours by Group",
        xaxis_title="Hours",
        yaxis_title="",
        showlegend=False,
        hovermode="y unified",
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        font={"color": "#ccc"},
        margin={"t": 40, "b": 40, "l": 120, "r": 20},
    )
    return fig


def weekly_heatmap(df: pd.DataFrame) -> go.Figure:
    """Create a heatmap-style table for the weekly report.

    Args:
        df: DataFrame from ``weekly_report`` with columns:
            project_name, Mon-Sun, Total.

    Returns:
        Plotly Figure (heatmap).
    """
    day_cols = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    if df.empty:
        fig = go.Figure()
        fig.update_layout(
            title="Weekly Overview",
            annotations=[{
                "text": "No data to display",
                "xref": "paper",
                "yref": "paper",
                "showarrow": False,
                "font": {"size": 16, "color": "#888"},
                "x": 0.5,
                "y": 0.5,
            }],
        )
        return fig

    # Extract only project rows (exclude Total row) for the heatmap body
    projects_df = df[df["project_name"] != "Total"].copy()

    if projects_df.empty:
        fig = go.Figure()
        fig.update_layout(title="Weekly Overview")
        return fig

    z_values = projects_df[day_cols].values.tolist()
    y_labels = projects_df["project_name"].tolist()

    # Create text annotations showing hours
    text_values = [[f"{v:.1f}h" if v > 0 else "" for v in row] for row in z_values]

    fig = go.Figure(data=go.Heatmap(
        z=z_values,
        x=day_cols,
        y=y_labels,
        text=text_values,
        texttemplate="%{text}",
        colorscale="Blues",
        hovertemplate="Project: %{y}<br>Day: %{x}<br>Hours: %{z:.2f}h<extra></extra>",
        showscale=True,
    ))

    fig.update_layout(
        title="Weekly Overview (Hours per Project per Day)",
        xaxis_title="",
        yaxis_title="",
        yaxis={"autorange": "reversed"},
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        font={"color": "#ccc"},
        margin={"t": 40, "b": 40, "l": 120, "r": 20},
    )
    return fig
