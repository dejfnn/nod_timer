"""Projects management page — list, create, edit, archive projects.

Provides the render() function called from app.py to display
the projects management UI.
"""

import streamlit as st

from config import DEFAULT_PROJECT_COLOR, PROJECT_COLORS
from models import client as client_model
from models import project as project_model
from ui.state import format_duration


def render() -> None:
    """Render the complete projects management page."""
    st.title("Projects")

    _render_new_project_form()
    st.divider()
    _render_project_list()


def _render_color_picker(key_prefix: str, current_color: str = DEFAULT_PROJECT_COLOR) -> str:
    """Render a color picker with preset palette.

    Args:
        key_prefix: Prefix for widget keys to ensure uniqueness.
        current_color: Currently selected color.

    Returns:
        Selected hex color string.
    """
    st.write("Color")
    cols = st.columns(len(PROJECT_COLORS))
    selected_color = current_color

    for i, color in enumerate(PROJECT_COLORS):
        with cols[i]:
            border = "3px solid white" if color == current_color else "1px solid #555"
            if st.button(
                " ",
                key=f"{key_prefix}_color_{i}",
                help=color,
                use_container_width=True,
            ):
                selected_color = color

            st.markdown(
                f'<div style="width:100%;height:24px;background-color:{color};'
                f'border-radius:4px;border:{border};margin-top:-10px;"></div>',
                unsafe_allow_html=True,
            )

    return selected_color


def _render_new_project_form() -> None:
    """Render the 'New Project' creation form."""
    with st.expander("New Project", expanded=False):
        # Initialize session state for color selection
        if "new_project_color" not in st.session_state:
            st.session_state.new_project_color = DEFAULT_PROJECT_COLOR

        with st.form(key="new_project_form"):
            name = st.text_input("Project name", key="new_proj_name")

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

            # Preview selected color
            st.markdown(
                f'<div style="width:60px;height:24px;background-color:{selected_color};'
                f'border-radius:4px;border:1px solid #555;"></div>',
                unsafe_allow_html=True,
            )

            # Client dropdown
            clients = client_model.get_all()
            client_options = {"(No client)": None}
            for c in clients:
                client_options[c.name] = c.id
            client_names = list(client_options.keys())
            selected_client_name = st.selectbox(
                "Client", client_names, key="new_proj_client"
            )

            col_bill, col_rate = st.columns(2)
            with col_bill:
                billable = st.checkbox("Billable", key="new_proj_billable")
            with col_rate:
                hourly_rate = st.number_input(
                    "Hourly rate",
                    min_value=0.0,
                    step=1.0,
                    key="new_proj_rate",
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
                st.success(f"Project '{name.strip()}' created.")
                st.rerun()


def _render_project_list() -> None:
    """Render the list of all projects with edit/archive controls."""
    show_archived = st.checkbox("Show archived projects", key="show_archived_projects")

    projects = project_model.get_all(include_archived=True) if show_archived else project_model.get_all()

    if not projects:
        st.info("No projects yet. Create one above!")
        return

    for proj in projects:
        _render_project_row(proj)


def _render_project_row(proj: project_model.Project) -> None:
    """Render a single project row with details and controls.

    Args:
        proj: The Project to display.
    """
    # Get tracked time
    total_seconds = project_model.get_total_tracked_time(proj.id)
    total_formatted = format_duration(total_seconds)
    hours_decimal = total_seconds / 3600

    # Get client name
    client_name = ""
    if proj.client_id is not None:
        client = client_model.get_by_id(proj.client_id)
        if client:
            client_name = client.name

    # Archive label
    archive_label = " [Archived]" if proj.archived else ""

    # Main row
    col_color, col_name, col_client, col_billable, col_time, col_actions = st.columns(
        [0.5, 2, 1.5, 1, 1.5, 1.5]
    )
    with col_color:
        st.markdown(
            f'<div style="width:20px;height:20px;border-radius:50%;'
            f'background-color:{proj.color};margin-top:8px;"></div>',
            unsafe_allow_html=True,
        )
    with col_name:
        st.markdown(f"**{proj.name}**{archive_label}")
    with col_client:
        st.text(client_name or "-")
    with col_billable:
        if proj.billable:
            st.text(f"${proj.hourly_rate:.2f}/h")
        else:
            st.text("Not billable")
    with col_time:
        st.text(f"{total_formatted} ({hours_decimal:.1f}h)")
    with col_actions:
        if proj.archived:
            if st.button("Unarchive", key=f"unarchive_proj_{proj.id}"):
                project_model.update(proj.id, archived=False)
                st.rerun()
        else:
            if st.button("Archive", key=f"archive_proj_{proj.id}"):
                project_model.update(proj.id, archived=True)
                st.rerun()

    # Edit in expander
    with st.expander(f"Edit {proj.name}", expanded=False):
        _render_edit_project_form(proj)

    st.markdown("---")


def _render_edit_project_form(proj: project_model.Project) -> None:
    """Render the inline edit form for a project.

    Args:
        proj: The Project being edited.
    """
    with st.form(key=f"edit_project_{proj.id}"):
        new_name = st.text_input(
            "Project name", value=proj.name, key=f"edit_proj_name_{proj.id}"
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

        # Preview selected color
        st.markdown(
            f'<div style="width:60px;height:24px;background-color:{new_color};'
            f'border-radius:4px;border:1px solid #555;"></div>',
            unsafe_allow_html=True,
        )

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

        selected_client_name = st.selectbox(
            "Client",
            client_names,
            index=current_client_idx,
            key=f"edit_proj_client_{proj.id}",
        )

        col_bill, col_rate = st.columns(2)
        with col_bill:
            new_billable = st.checkbox(
                "Billable", value=proj.billable, key=f"edit_proj_bill_{proj.id}"
            )
        with col_rate:
            new_rate = st.number_input(
                "Hourly rate",
                min_value=0.0,
                step=1.0,
                value=proj.hourly_rate,
                key=f"edit_proj_rate_{proj.id}",
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
            st.success(f"Project '{new_name.strip()}' updated.")
            st.rerun()
