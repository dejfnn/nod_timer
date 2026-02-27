"""Projects management page — list, create, edit, archive projects.

Provides the render() function called from app.py to display
the projects management UI with card-based layout, visual color picker,
and tracked-time progress bars.
"""

import streamlit as st

from config import DEFAULT_PROJECT_COLOR, PROJECT_COLORS
from models import client as client_model
from models import project as project_model
from ui.components import color_swatch_picker, empty_state
from ui.state import format_duration
from ui.styles import MANAGEMENT_STYLES


def render() -> None:
    """Render the complete projects management page."""
    st.markdown(MANAGEMENT_STYLES, unsafe_allow_html=True)

    st.markdown(
        '<div class="tf-page-content">',
        unsafe_allow_html=True,
    )
    st.markdown(
        '<div class="tf-page-title">Projects</div>',
        unsafe_allow_html=True,
    )

    _render_new_project_form()
    _render_project_list()

    st.markdown("</div>", unsafe_allow_html=True)


def _render_new_project_form() -> None:
    """Render the 'New Project' creation form in a prominent card with accent border."""
    # Initialize session state for color selection
    if "new_project_color" not in st.session_state:
        st.session_state.new_project_color = DEFAULT_PROJECT_COLOR

    st.markdown(
        '<div class="tf-new-form-card">'
        '<div class="form-title">+ New Project</div>'
        "</div>",
        unsafe_allow_html=True,
    )

    with st.form(key="new_project_form"):
        st.markdown('<div class="tf-form-label">Project Name</div>', unsafe_allow_html=True)
        name = st.text_input("Project name", key="new_proj_name", label_visibility="collapsed")

        # Color picker using selectbox with preset colors
        color_index = 0
        if st.session_state.new_project_color in PROJECT_COLORS:
            color_index = PROJECT_COLORS.index(st.session_state.new_project_color)
        selected_color = st.selectbox(
            "Color",
            options=PROJECT_COLORS,
            index=color_index,
            format_func=lambda c: f"{c} {chr(9632)}",
            key="new_proj_color_select",
        )

        # Preview selected color as a swatch grid display
        _render_color_preview_grid(selected_color)

        # Client dropdown
        clients = client_model.get_all()
        client_options = {"(No client)": None}
        for c in clients:
            client_options[c.name] = c.id
        client_names = list(client_options.keys())

        st.markdown('<div class="tf-form-label">Client</div>', unsafe_allow_html=True)
        selected_client_name = st.selectbox(
            "Client", client_names, key="new_proj_client", label_visibility="collapsed"
        )

        col_bill, col_rate = st.columns(2)
        with col_bill:
            st.markdown('<div class="tf-form-label">Billable</div>', unsafe_allow_html=True)
            billable = st.checkbox("Billable", key="new_proj_billable", label_visibility="collapsed")
        with col_rate:
            st.markdown('<div class="tf-form-label">Hourly Rate</div>', unsafe_allow_html=True)
            hourly_rate = st.number_input(
                "Hourly rate",
                min_value=0.0,
                step=1.0,
                key="new_proj_rate",
                label_visibility="collapsed",
            )

        submitted = st.form_submit_button("Create Project", use_container_width=True)

    if submitted:
        if not name.strip():
            st.error("Project name cannot be empty.")
        else:
            client_id = client_options[selected_client_name]
            project_model.create(
                name=name.strip(),
                color=selected_color,
                client_id=client_id,
                billable=billable,
                hourly_rate=hourly_rate,
            )
            st.toast(f"Project '{name.strip()}' created.", icon="✅")
            st.rerun()


def _render_color_preview_grid(selected_color: str) -> None:
    """Render a visual 4x4 grid showing all project colors with selected indicator.

    Args:
        selected_color: The currently selected hex color.
    """
    swatches_html = ""
    for color in PROJECT_COLORS:
        sel_class = "selected" if color == selected_color else ""
        swatches_html += (
            f'<div class="tf-color-swatch {sel_class}" '
            f'style="background-color: {color};">'
            f'<span class="checkmark">&#10003;</span>'
            f'</div>'
        )

    st.markdown(
        f'<div class="tf-form-label">Color Preview</div>'
        f'<div class="tf-color-grid">{swatches_html}</div>',
        unsafe_allow_html=True,
    )


def _render_project_list() -> None:
    """Render the list of all projects as styled cards with edit/archive controls."""
    show_archived = st.checkbox("Show archived projects", key="show_archived_projects")

    projects = project_model.get_all(include_archived=True) if show_archived else project_model.get_all()

    if not projects:
        empty_state(
            "No projects yet.",
            icon="📁",
            hint="Create your first project using the form above!",
        )
        return

    # Compute max tracked time for relative progress bars
    max_tracked = 0
    tracked_times: dict[int, int] = {}
    for proj in projects:
        total_seconds = project_model.get_total_tracked_time(proj.id)
        tracked_times[proj.id] = total_seconds
        if total_seconds > max_tracked:
            max_tracked = total_seconds

    for proj in projects:
        _render_project_card(proj, tracked_times.get(proj.id, 0), max_tracked)


def _render_project_card(
    proj: project_model.Project,
    total_seconds: int,
    max_tracked: int,
) -> None:
    """Render a single project as a styled card.

    Args:
        proj: The Project to display.
        total_seconds: Total tracked seconds for this project.
        max_tracked: Maximum tracked seconds across all projects (for relative bar).
    """
    total_formatted = format_duration(total_seconds)
    hours_decimal = total_seconds / 3600

    # Get client name
    client_name = ""
    if proj.client_id is not None:
        client = client_model.get_by_id(proj.client_id)
        if client:
            client_name = client.name

    # Build badge HTML
    client_badge = (
        f'<span class="client-badge">{client_name}</span>' if client_name else ""
    )
    billable_badge = (
        f'<span class="billable-badge">${proj.hourly_rate:.2f}/h</span>'
        if proj.billable
        else ""
    )
    archived_badge = (
        '<span class="archived-badge">Archived</span>' if proj.archived else ""
    )

    # Progress bar width relative to project with most time
    progress_pct = (total_seconds / max_tracked * 100) if max_tracked > 0 else 0

    # Render the card HTML
    st.markdown(
        f"""
        <div class="tf-project-card" style="border-left-color: {proj.color};">
            <div class="project-top-row">
                <span class="project-name">{proj.name}</span>
                {client_badge}
                {billable_badge}
                {archived_badge}
            </div>
            <div class="project-bottom-row">
                <div class="tf-mini-progress">
                    <div class="fill" style="width: {progress_pct:.1f}%; background: {proj.color};"></div>
                </div>
                <span class="tracked-hours">{total_formatted} ({hours_decimal:.1f}h)</span>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Action buttons row: archive/unarchive + edit expander
    col_archive, col_edit = st.columns([1, 5])
    with col_archive:
        if proj.archived:
            if st.button("📦 Unarchive", key=f"unarchive_proj_{proj.id}"):
                project_model.update(proj.id, archived=False)
                st.rerun()
        else:
            if st.button("📦", key=f"archive_proj_{proj.id}", help="Archive project"):
                project_model.update(proj.id, archived=True)
                st.rerun()
    with col_edit:
        pass  # Spacer

    # Edit in expander
    with st.expander(f"Edit {proj.name}", expanded=False):
        _render_edit_project_form(proj)


def _render_edit_project_form(proj: project_model.Project) -> None:
    """Render the inline edit form for a project.

    Args:
        proj: The Project being edited.
    """
    with st.form(key=f"edit_project_{proj.id}"):
        st.markdown('<div class="tf-form-label">Project Name</div>', unsafe_allow_html=True)
        new_name = st.text_input(
            "Project name", value=proj.name, key=f"edit_proj_name_{proj.id}",
            label_visibility="collapsed",
        )

        # Color picker
        color_index = 0
        if proj.color in PROJECT_COLORS:
            color_index = PROJECT_COLORS.index(proj.color)
        new_color = st.selectbox(
            "Color",
            options=PROJECT_COLORS,
            index=color_index,
            format_func=lambda c: f"{c} {chr(9632)}",
            key=f"edit_proj_color_{proj.id}",
        )

        # Show visual color grid preview
        _render_color_preview_grid_for_edit(new_color, proj.id)

        # Client dropdown
        clients = client_model.get_all()
        client_options = {"(No client)": None}
        for c in clients:
            client_options[c.name] = c.id
        client_names = list(client_options.keys())

        current_client_idx = 0
        if proj.client_id is not None:
            for i, name in enumerate(client_names):
                if client_options.get(name) == proj.client_id:
                    current_client_idx = i
                    break

        st.markdown('<div class="tf-form-label">Client</div>', unsafe_allow_html=True)
        selected_client_name = st.selectbox(
            "Client",
            client_names,
            index=current_client_idx,
            key=f"edit_proj_client_{proj.id}",
            label_visibility="collapsed",
        )

        col_bill, col_rate = st.columns(2)
        with col_bill:
            st.markdown('<div class="tf-form-label">Billable</div>', unsafe_allow_html=True)
            new_billable = st.checkbox(
                "Billable", value=proj.billable, key=f"edit_proj_bill_{proj.id}",
                label_visibility="collapsed",
            )
        with col_rate:
            st.markdown('<div class="tf-form-label">Hourly Rate</div>', unsafe_allow_html=True)
            new_rate = st.number_input(
                "Hourly rate",
                min_value=0.0,
                step=1.0,
                value=proj.hourly_rate,
                key=f"edit_proj_rate_{proj.id}",
                label_visibility="collapsed",
            )

        save_clicked = st.form_submit_button("Save changes", use_container_width=True)

    if save_clicked:
        if not new_name.strip():
            st.error("Project name cannot be empty.")
        else:
            new_client_id = client_options[selected_client_name]
            project_model.update(
                proj.id,
                name=new_name.strip(),
                color=new_color,
                client_id=new_client_id,
                billable=new_billable,
                hourly_rate=new_rate,
            )
            st.toast(f"Project '{new_name.strip()}' updated.", icon="✅")
            st.rerun()


def _render_color_preview_grid_for_edit(selected_color: str, project_id: int) -> None:
    """Render a visual 4x4 grid showing all project colors for edit context.

    Args:
        selected_color: The currently selected hex color.
        project_id: Project ID used for uniqueness.
    """
    swatches_html = ""
    for color in PROJECT_COLORS:
        sel_class = "selected" if color == selected_color else ""
        swatches_html += (
            f'<div class="tf-color-swatch {sel_class}" '
            f'style="background-color: {color};">'
            f'<span class="checkmark">&#10003;</span>'
            f'</div>'
        )

    st.markdown(
        f'<div class="tf-form-label">Color Preview</div>'
        f'<div class="tf-color-grid">{swatches_html}</div>',
        unsafe_allow_html=True,
    )
