"""Clients management page — list, create, edit, archive clients.

Provides the render() function called from app.py to display
the clients management UI.
"""

import streamlit as st

from models import client as client_model


def render() -> None:
    """Render the complete clients management page."""
    st.title("Clients")

    _render_new_client_form()
    st.divider()
    _render_client_list()


def _render_new_client_form() -> None:
    """Render the 'New Client' creation form."""
    with st.expander("New Client", expanded=False):
        with st.form(key="new_client_form"):
            name = st.text_input("Client name", key="new_client_name")
            submitted = st.form_submit_button("Create Client", use_container_width=True)

        if submitted:
            if not name.strip():
                st.error("Client name cannot be empty.")
            else:
                try:
                    client_model.create(name=name.strip())
                    st.success(f"Client '{name.strip()}' created.")
                    st.rerun()
                except Exception:
                    st.error(f"Client '{name.strip()}' already exists.")


def _render_client_list() -> None:
    """Render the list of all clients with edit/archive controls."""
    show_archived = st.checkbox("Show archived clients", key="show_archived_clients")

    clients = (
        client_model.get_all(include_archived=True)
        if show_archived
        else client_model.get_all()
    )

    if not clients:
        st.info("No clients yet. Create one above!")
        return

    for c in clients:
        _render_client_row(c)


def _render_client_row(c: client_model.Client) -> None:
    """Render a single client row with details and controls.

    Args:
        c: The Client to display.
    """
    project_count = client_model.get_project_count(c.id)
    archive_label = " [Archived]" if c.archived else ""

    col_name, col_projects, col_actions = st.columns([3, 2, 2])
    with col_name:
        st.markdown(f"**{c.name}**{archive_label}")
    with col_projects:
        st.text(f"{project_count} project(s)")
    with col_actions:
        if c.archived:
            if st.button("Unarchive", key=f"unarchive_client_{c.id}"):
                client_model.update(c.id, archived=False)
                st.rerun()
        else:
            if st.button("Archive", key=f"archive_client_{c.id}"):
                # Validate: cannot archive if client has active (non-archived) projects
                if client_model.has_active_projects(c.id):
                    st.error(
                        f"Cannot archive '{c.name}': this client has active (non-archived) projects. "
                        "Archive or reassign those projects first."
                    )
                else:
                    client_model.update(c.id, archived=True)
                    st.rerun()

    # Edit in expander
    with st.expander(f"Edit {c.name}", expanded=False):
        _render_edit_client_form(c)

    st.markdown("---")


def _render_edit_client_form(c: client_model.Client) -> None:
    """Render the inline edit form for a client.

    Args:
        c: The Client being edited.
    """
    with st.form(key=f"edit_client_{c.id}"):
        new_name = st.text_input(
            "Client name", value=c.name, key=f"edit_client_name_{c.id}"
        )
        save_clicked = st.form_submit_button("Save changes", use_container_width=True)

    if save_clicked:
        if not new_name.strip():
            st.error("Client name cannot be empty.")
        else:
            try:
                client_model.update(c.id, name=new_name.strip())
                st.success(f"Client '{new_name.strip()}' updated.")
                st.rerun()
            except Exception:
                st.error(f"Client name '{new_name.strip()}' already exists.")
