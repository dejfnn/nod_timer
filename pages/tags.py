"""Tags management page — list, create, edit, delete tags.

Provides the render() function called from app.py to display
the tags management UI. Deleting a tag cascades to the time_entry_tags
junction table via the database ON DELETE CASCADE constraint.
"""

import streamlit as st

from models import tag as tag_model


def render() -> None:
    """Render the complete tags management page."""
    st.title("Tags")

    _render_new_tag_form()
    st.divider()
    _render_tag_list()


def _render_new_tag_form() -> None:
    """Render the 'New Tag' creation form."""
    with st.expander("New Tag", expanded=False):
        with st.form(key="new_tag_form"):
            name = st.text_input("Tag name", key="new_tag_name")
            submitted = st.form_submit_button("Create Tag", use_container_width=True)

        if submitted:
            if not name.strip():
                st.error("Tag name cannot be empty.")
            else:
                try:
                    tag_model.create(name=name.strip())
                    st.success(f"Tag '{name.strip()}' created.")
                    st.rerun()
                except Exception:
                    st.error(f"Tag '{name.strip()}' already exists.")


def _render_tag_list() -> None:
    """Render the list of all tags with usage count, edit, and delete controls."""
    tags = tag_model.get_all()

    if not tags:
        st.info("No tags yet. Create one above!")
        return

    # Handle pending delete confirmation
    confirm_tag_id = st.session_state.get("confirm_delete_tag_id")
    if confirm_tag_id is not None:
        _render_delete_confirmation(confirm_tag_id)

    for t in tags:
        _render_tag_row(t)


def _render_tag_row(t: tag_model.Tag) -> None:
    """Render a single tag row with details and controls.

    Args:
        t: The Tag to display.
    """
    usage_count = tag_model.get_usage_count(t.id)

    col_name, col_usage, col_actions = st.columns([3, 2, 2])
    with col_name:
        st.markdown(f"**{t.name}**")
    with col_usage:
        entry_word = "entry" if usage_count == 1 else "entries"
        st.text(f"Used in {usage_count} {entry_word}")
    with col_actions:
        if st.button("Delete", key=f"delete_tag_{t.id}"):
            st.session_state.confirm_delete_tag_id = t.id
            st.rerun()

    # Edit in expander
    with st.expander(f"Edit {t.name}", expanded=False):
        _render_edit_tag_form(t)

    st.markdown("---")


def _render_edit_tag_form(t: tag_model.Tag) -> None:
    """Render the inline edit form for a tag.

    Args:
        t: The Tag being edited.
    """
    with st.form(key=f"edit_tag_{t.id}"):
        new_name = st.text_input(
            "Tag name", value=t.name, key=f"edit_tag_name_{t.id}"
        )
        save_clicked = st.form_submit_button("Save changes", use_container_width=True)

    if save_clicked:
        if not new_name.strip():
            st.error("Tag name cannot be empty.")
        else:
            try:
                tag_model.update(t.id, name=new_name.strip())
                st.success(f"Tag '{new_name.strip()}' updated.")
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
            st.success(f"Tag '{tag_name}' deleted.")
            st.rerun()
    with col_no:
        if st.button("Cancel", key=f"cancel_del_tag_{tag_id}"):
            st.session_state.confirm_delete_tag_id = None
            st.rerun()
