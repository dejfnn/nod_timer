"""Clients management page — list, create, edit, archive clients.

Provides the render() function called from app.py to display
the clients management UI with card-based layout and project pills.
"""

import streamlit as st

from models import client as client_model
from models import project as project_model
from ui.components import empty_state
from ui.styles import MANAGEMENT_STYLES


def render() -> None:
    """Render the complete clients management page."""
    st.markdown(MANAGEMENT_STYLES, unsafe_allow_html=True)

    st.markdown(
        '<div class="tf-page-content">',
        unsafe_allow_html=True,
    )
    st.markdown(
        '<div class="tf-page-title">Clients</div>',
        unsafe_allow_html=True,
    )

    _render_new_client_form()
    _render_client_list()

    st.markdown("</div>", unsafe_allow_html=True)


def _render_new_client_form() -> None:
    """Render the 'New Client' creation form in a prominent card."""
    st.markdown(
        '<div class="tf-new-form-card">'
        '<div class="form-title">+ New Client</div>'
        "</div>",
        unsafe_allow_html=True,
    )

    with st.form(key="new_client_form"):
        st.markdown('<div class="tf-form-label">Client Name</div>', unsafe_allow_html=True)
        name = st.text_input("Client name", key="new_client_name", label_visibility="collapsed")
        submitted = st.form_submit_button("Create Client", use_container_width=True)

    if submitted:
        if not name.strip():
            st.error("Client name cannot be empty.")
        else:
            try:
                client_model.create(name=name.strip())
                st.toast(f"Client '{name.strip()}' created.", icon="✅")
                st.rerun()
            except Exception:
                st.error(f"Client '{name.strip()}' already exists.")


def _render_client_list() -> None:
    """Render the list of all clients as styled cards with project pills."""
    show_archived = st.checkbox("Show archived clients", key="show_archived_clients")

    clients = (
        client_model.get_all(include_archived=True)
        if show_archived
        else client_model.get_all()
    )

    if not clients:
        empty_state(
            "No clients yet.",
            icon="👥",
            hint="Create your first client using the form above!",
        )
        return

    for c in clients:
        _render_client_card(c)


def _render_client_card(c: client_model.Client) -> None:
    """Render a single client as a styled card with project pills.

    Args:
        c: The Client to display.
    """
    project_count = client_model.get_project_count(c.id)
    archived_badge = (
        '<span class="archived-badge" style="display:inline-flex;align-items:center;'
        "padding:2px 10px;border-radius:20px;font-size:0.78rem;font-weight:500;"
        "background:rgba(90,98,112,0.15);color:var(--tf-text-muted);"
        'border:1px solid rgba(90,98,112,0.25);">Archived</span>'
        if c.archived
        else ""
    )

    count_label = "project" if project_count == 1 else "projects"

    # Fetch linked projects for this client
    all_projects = project_model.get_all(include_archived=True)
    client_projects = [p for p in all_projects if p.client_id == c.id]

    # Build project pills HTML
    pills_html = ""
    if client_projects:
        pills = []
        for p in client_projects:
            pills.append(
                f'<span class="tf-client-project-pill" '
                f'style="background: {p.color}22; color: {p.color}; '
                f'border: 1px solid {p.color}44;">'
                f'<span class="dot" style="background: {p.color};"></span>'
                f'{p.name}</span>'
            )
        pills_html = '<div class="tf-client-projects">' + "".join(pills) + "</div>"

    # Render the card
    st.markdown(
        f"""
        <div class="tf-client-card">
            <div class="client-header">
                <span class="client-name">{c.name}</span>
                <span class="project-count-badge">{project_count} {count_label}</span>
                {archived_badge}
            </div>
            {pills_html}
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Action buttons
    col_action, col_spacer = st.columns([1, 5])
    with col_action:
        if c.archived:
            if st.button("Unarchive", key=f"unarchive_client_{c.id}"):
                client_model.update(c.id, archived=False)
                st.rerun()
        else:
            if st.button("📦", key=f"archive_client_{c.id}", help="Archive client"):
                # Validate: cannot archive if client has active (non-archived) projects
                if client_model.has_active_projects(c.id):
                    st.error(
                        f"Cannot archive '{c.name}': this client has active (non-archived) projects. "
                        "Archive or reassign those projects first."
                    )
                else:
                    client_model.update(c.id, archived=True)
                    st.rerun()
    with col_spacer:
        pass

    # Edit in expander
    with st.expander(f"Edit {c.name}", expanded=False):
        _render_edit_client_form(c)


def _render_edit_client_form(c: client_model.Client) -> None:
    """Render the inline edit form for a client.

    Args:
        c: The Client being edited.
    """
    with st.form(key=f"edit_client_{c.id}"):
        st.markdown('<div class="tf-form-label">Client Name</div>', unsafe_allow_html=True)
        new_name = st.text_input(
            "Client name", value=c.name, key=f"edit_client_name_{c.id}",
            label_visibility="collapsed",
        )
        save_clicked = st.form_submit_button("Save changes", use_container_width=True)

    if save_clicked:
        if not new_name.strip():
            st.error("Client name cannot be empty.")
        else:
            try:
                client_model.update(c.id, name=new_name.strip())
                st.toast(f"Client '{new_name.strip()}' updated.", icon="✅")
                st.rerun()
            except Exception:
                st.error(f"Client name '{new_name.strip()}' already exists.")
