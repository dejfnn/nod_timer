"""Tags management page — list, create, edit, delete tags.

Provides the render() function called from app.py to display
the tags management UI. Tags are displayed as a grid of pill badges
with usage counts. Deleting a tag cascades to the time_entry_tags
junction table via the database ON DELETE CASCADE constraint.
"""

import streamlit as st

from models import tag as tag_model
from ui.components import empty_state, tag_pill
from ui.styles import MANAGEMENT_STYLES


def render() -> None:
    """Render the complete tags management page."""
    st.markdown(MANAGEMENT_STYLES, unsafe_allow_html=True)

    st.markdown(
        '<div class="tf-page-content">',
        unsafe_allow_html=True,
    )
    st.markdown(
        '<div class="tf-page-title">Tags</div>',
        unsafe_allow_html=True,
    )

    _render_new_tag_form()
    _render_tag_grid()

    st.markdown("</div>", unsafe_allow_html=True)


def _render_new_tag_form() -> None:
    """Render the 'New Tag' as a simple inline input with '+' button."""
    st.markdown(
        '<div class="tf-form-label">New Tag</div>',
        unsafe_allow_html=True,
    )
    col_input, col_btn = st.columns([4, 1])
    with col_input:
        name = st.text_input(
            "Tag name",
            key="new_tag_name",
            label_visibility="collapsed",
            placeholder="Enter tag name...",
        )
    with col_btn:
        add_clicked = st.button("+", key="add_tag_btn", use_container_width=True, help="Create tag")

    if add_clicked:
        if not name or not name.strip():
            st.error("Tag name cannot be empty.")
        else:
            try:
                tag_model.create(name=name.strip())
                st.toast(f"Tag '{name.strip()}' created.", icon="✅")
                st.rerun()
            except Exception:
                st.error(f"Tag '{name.strip()}' already exists.")

    st.markdown('<div class="tf-section"></div>', unsafe_allow_html=True)


def _render_tag_grid() -> None:
    """Render all tags as a grid of pill badges with usage counts."""
    tags = tag_model.get_all()

    if not tags:
        empty_state(
            "No tags yet.",
            icon="🏷️",
            hint="Create your first tag using the input above!",
        )
        return

    # Handle pending delete confirmation
    confirm_tag_id = st.session_state.get("confirm_delete_tag_id")
    if confirm_tag_id is not None:
        _render_delete_confirmation(confirm_tag_id)

    # Render all tags as pills in a visual grid
    pills_html = ""
    for t in tags:
        usage_count = tag_model.get_usage_count(t.id)
        pills_html += tag_pill(t.name, usage_count)

    st.markdown(
        f'<div class="tf-tag-grid">{pills_html}</div>',
        unsafe_allow_html=True,
    )

    st.markdown('<div class="tf-section"></div>', unsafe_allow_html=True)

    # Render individual tag edit/delete rows below the grid
    for t in tags:
        _render_tag_edit_row(t)


def _render_tag_edit_row(t: tag_model.Tag) -> None:
    """Render edit and delete controls for a single tag, expandable inline.

    Args:
        t: The Tag to display controls for.
    """
    usage_count = tag_model.get_usage_count(t.id)
    entry_word = "entry" if usage_count == 1 else "entries"

    with st.expander(f"{t.name} — {usage_count} {entry_word}", expanded=False):
        _render_edit_tag_form(t)

        if st.button("Delete", key=f"delete_tag_{t.id}"):
            st.session_state.confirm_delete_tag_id = t.id
            st.rerun()


def _render_edit_tag_form(t: tag_model.Tag) -> None:
    """Render the inline edit form for a tag.

    Args:
        t: The Tag being edited.
    """
    with st.form(key=f"edit_tag_{t.id}"):
        st.markdown('<div class="tf-form-label">Tag Name</div>', unsafe_allow_html=True)
        new_name = st.text_input(
            "Tag name", value=t.name, key=f"edit_tag_name_{t.id}",
            label_visibility="collapsed",
        )
        save_clicked = st.form_submit_button("Save changes", use_container_width=True)

    if save_clicked:
        if not new_name.strip():
            st.error("Tag name cannot be empty.")
        else:
            try:
                tag_model.update(t.id, name=new_name.strip())
                st.toast(f"Tag '{new_name.strip()}' updated.", icon="✅")
                st.rerun()
            except Exception:
                st.error(f"Tag name '{new_name.strip()}' already exists.")


def _render_delete_confirmation(tag_id: int) -> None:
    """Show a confirmation dialog for deleting a tag.

    Deleting a tag removes it from all time entries via CASCADE.

    Args:
        tag_id: ID of the tag to potentially delete.
    """
    tag = tag_model.get_by_id(tag_id)
    tag_name = tag.name if tag else f"#{tag_id}"
    usage_count = tag_model.get_usage_count(tag_id)

    warning_msg = f"Are you sure you want to delete tag '{tag_name}'?"
    if usage_count > 0:
        entry_word = "entry" if usage_count == 1 else "entries"
        warning_msg += f" It will be removed from {usage_count} time {entry_word}."

    st.warning(warning_msg)
    col_yes, col_no = st.columns(2)
    with col_yes:
        if st.button("Yes, delete", key=f"confirm_del_tag_{tag_id}"):
            tag_model.delete(tag_id)
            st.session_state.confirm_delete_tag_id = None
            st.toast(f"Tag '{tag_name}' deleted.", icon="🗑️")
            st.rerun()
    with col_no:
        if st.button("Cancel", key=f"cancel_del_tag_{tag_id}"):
            st.session_state.confirm_delete_tag_id = None
            st.rerun()
