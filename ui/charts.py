"""Plotly chart builder functions for TimeFlow.

Each function takes data (usually a pandas DataFrame) and returns
a plotly Figure object ready for display with st.plotly_chart().

All charts use the ``DARK_LAYOUT`` template matching the app's dark theme:
transparent backgrounds, navy grid lines, light text, and consistent margins.
"""

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go


# ---------------------------------------------------------------------------
# Dark theme layout template (shared by all charts)
# ---------------------------------------------------------------------------
DARK_LAYOUT: dict = {
    "plot_bgcolor": "rgba(0,0,0,0)",
    "paper_bgcolor": "rgba(0,0,0,0)",
    "font": {
        "color": "#e8eaed",
        "family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    "margin": {"t": 40, "b": 40, "l": 50, "r": 20},
    "xaxis": {
        "gridcolor": "rgba(255,255,255,0.06)",
        "zerolinecolor": "rgba(255,255,255,0.06)",
        "tickfont": {"color": "#9aa0b0"},
    },
    "yaxis": {
        "gridcolor": "rgba(255,255,255,0.06)",
        "zerolinecolor": "rgba(255,255,255,0.06)",
        "tickfont": {"color": "#9aa0b0"},
    },
    "hoverlabel": {
        "bgcolor": "#1a2035",
        "font_color": "#e8eaed",
        "bordercolor": "rgba(255,255,255,0.12)",
    },
}

_CHART_HEIGHT = 350

# Color constants
_PRIMARY_BLUE = "#4A90D9"
_ACCENT_TEAL = "#00d4aa"
_GRADIENT_COLORS = ["#4A90D9", "#3aa0c8", "#20b0b0", "#00c4a0", "#00d4aa"]


def _apply_dark_layout(fig: go.Figure, **overrides) -> go.Figure:
    """Apply the dark theme layout to a figure.

    Args:
        fig: Plotly Figure to style.
        **overrides: Additional layout parameters to override.

    Returns:
        The same Figure with updated layout.
    """
    layout_kwargs = {**DARK_LAYOUT, **overrides}
    fig.update_layout(**layout_kwargs)
    return fig


def _empty_chart(title: str) -> go.Figure:
    """Create a styled empty chart with a 'No data' annotation.

    Args:
        title: Chart title.

    Returns:
        Plotly Figure with centered 'No data' message.
    """
    fig = go.Figure()
    _apply_dark_layout(
        fig,
        title=title,
        height=_CHART_HEIGHT,
        annotations=[{
            "text": "No data to display",
            "xref": "paper",
            "yref": "paper",
            "showarrow": False,
            "font": {"size": 16, "color": "#5a6270"},
            "x": 0.5,
            "y": 0.5,
        }],
    )
    return fig


def daily_bar_chart(df: pd.DataFrame) -> go.Figure:
    """Create a bar chart of hours per day with gradient fill bars.

    Args:
        df: DataFrame with columns ``date`` (str) and ``hours`` (float).

    Returns:
        Plotly Figure.
    """
    if df.empty:
        return _empty_chart("Daily Tracked Time")

    # Format date labels as short day names
    df = df.copy()
    df["label"] = pd.to_datetime(df["date"]).dt.strftime("%a %m/%d")

    # Assign gradient colors to bars (blue to teal)
    num_bars = len(df)
    if num_bars == 1:
        bar_colors = [_PRIMARY_BLUE]
    else:
        bar_colors = [
            _GRADIENT_COLORS[int(i * (len(_GRADIENT_COLORS) - 1) / (num_bars - 1))]
            for i in range(num_bars)
        ]

    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=df["label"],
        y=df["hours"],
        marker={
            "color": bar_colors,
            "line": {"width": 0},
            "cornerradius": 4,
        },
        hovertemplate="%{y:.2f}h<extra></extra>",
        text=df["hours"].apply(lambda v: f"{v:.1f}h" if v > 0.05 else ""),
        textposition="outside",
        textfont={"color": "#9aa0b0", "size": 11},
    ))

    _apply_dark_layout(
        fig,
        title="Last 7 Days",
        xaxis_title="",
        yaxis_title="Hours",
        showlegend=False,
        hovermode="x unified",
        height=_CHART_HEIGHT,
        bargap=0.3,
    )

    return fig


def project_donut_chart(df: pd.DataFrame) -> go.Figure:
    """Create a donut chart of project time distribution.

    Features center text showing total hours, labels on segments, no legend.

    Args:
        df: DataFrame with columns ``project_name``, ``hours``, ``color``.

    Returns:
        Plotly Figure.
    """
    if df.empty:
        return _empty_chart("Project Distribution")

    colors = df["color"].tolist()
    total_hours = df["hours"].sum()

    fig = go.Figure(data=[go.Pie(
        labels=df["project_name"],
        values=df["hours"],
        hole=0.55,
        marker={"colors": colors, "line": {"color": "#0a0e1a", "width": 2}},
        textinfo="label+percent",
        textposition="outside",
        textfont={"color": "#e8eaed", "size": 12},
        hovertemplate="%{label}: %{value:.2f}h (%{percent})<extra></extra>",
        pull=[0.02] * len(df),
    )])

    _apply_dark_layout(
        fig,
        title="Project Distribution (This Week)",
        showlegend=False,
        height=_CHART_HEIGHT,
        annotations=[{
            "text": f"<b>{total_hours:.1f}h</b><br><span style='font-size:11px;color:#9aa0b0'>total</span>",
            "x": 0.5,
            "y": 0.5,
            "font": {"size": 20, "color": "#e8eaed"},
            "showarrow": False,
        }],
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
        return _empty_chart("Summary")

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
        marker={
            "color": colors if colors else _PRIMARY_BLUE,
            "line": {"width": 0},
            "cornerradius": 3,
        },
        hovertemplate="%{y}: %{x:.2f}h<extra></extra>",
        text=plot_df[value_col].apply(lambda v: f"{v:.1f}h"),
        textposition="outside",
        textfont={"color": "#9aa0b0", "size": 11},
    ))

    _apply_dark_layout(
        fig,
        title="Hours by Group",
        xaxis_title="Hours",
        yaxis_title="",
        showlegend=False,
        hovermode="y unified",
        height=max(_CHART_HEIGHT, len(plot_df) * 40 + 80),
        margin={"t": 40, "b": 40, "l": 120, "r": 60},
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
        return _empty_chart("Weekly Overview")

    # Extract only project rows (exclude Total row) for the heatmap body
    projects_df = df[df["project_name"] != "Total"].copy()

    if projects_df.empty:
        fig = go.Figure()
        _apply_dark_layout(fig, title="Weekly Overview", height=_CHART_HEIGHT)
        return fig

    z_values = projects_df[day_cols].values.tolist()
    y_labels = projects_df["project_name"].tolist()

    # Create text annotations showing hours
    text_values = [[f"{v:.1f}h" if v > 0 else "" for v in row] for row in z_values]

    # Custom colorscale matching dark theme (navy to teal)
    colorscale = [
        [0.0, "rgba(19, 24, 41, 0.5)"],
        [0.25, "rgba(74, 144, 217, 0.3)"],
        [0.5, "rgba(74, 144, 217, 0.5)"],
        [0.75, "rgba(0, 212, 170, 0.5)"],
        [1.0, "rgba(0, 212, 170, 0.8)"],
    ]

    fig = go.Figure(data=go.Heatmap(
        z=z_values,
        x=day_cols,
        y=y_labels,
        text=text_values,
        texttemplate="%{text}",
        textfont={"color": "#e8eaed", "size": 12},
        colorscale=colorscale,
        hovertemplate="Project: %{y}<br>Day: %{x}<br>Hours: %{z:.2f}h<extra></extra>",
        showscale=False,
        xgap=3,
        ygap=3,
    ))

    _apply_dark_layout(
        fig,
        title="Weekly Overview (Hours per Project per Day)",
        xaxis_title="",
        yaxis_title="",
        yaxis={"autorange": "reversed"},
        height=max(250, len(y_labels) * 45 + 100),
        margin={"t": 40, "b": 40, "l": 120, "r": 20},
    )
    return fig
