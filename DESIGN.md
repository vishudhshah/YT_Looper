# Design

A compact utility for repeating a video segment. Prioritize the two time fields and one main action. Use a warm paper surface for a small, readable popup, dark ink, and a restrained rust accent for the selected range and starting playback. Green indicates an active loop; status text also communicates every state without relying on color.

Use the operating system's UI font, tabular time numerals, visible keyboard focus, explicit field labels, and full-width primary actions. Use whitespace and thin dividers instead of nested cards. Draw icons with consistent SVG strokes. Keep validation beside the range and retain an accessible stop action while editing an active loop.

The popup is 340px wide. Keep only a small header, one-line video title, two time inputs with current-position actions, a format hint, and the loop button. Omit the timeline, section heading, decorative icon, and footer. Show field-specific validation errors only when invalid; allow stopping an active loop even with invalid draft edits. Respect reduced motion. Do not add accounts, marketing panels, unrelated controls, or remote assets.

Active loops show two small pale brackets on YouTube’s native seek bar. The start bracket opens right; the stop bracket opens left. Markers follow timeline visibility and sizing, ignore pointer events, and disappear when inactive or during ads. Avoid permanent labels, handles, or a competing progress bar.

The on-page controls appear automatically inside YouTube's below-player metadata section, above its title. Keep a dedicated 24px spacer inside the shadow root above the panel, so YouTube styles cannot override the gap and use a positioned, isolated host so ambient mode does not cover the controls. Initial injection must not scroll or focus inputs. Closing controls hides them for the current page session without stopping playback; the popup can reveal them again.

Keep the on-page strip compact: 10px vertical padding, 34px inputs and action button, two equally sized flexible time-field columns, and a close button aligned to the right. Preserve the separate 24px spacer above it.

The on-page panel spans the available video column width with internal padding. Keep time inputs compact, push the main action to the right, and anchor the close button 6px from the top-right corner with clearance for the controls.

A compact two-handle slider below the time fields selects the range without crossing endpoints. Keep native keyboard-accessible range inputs, visible focus, an accent selection track, and time values synchronized. Apply changes to active loops on handle release. The popup includes a labeled switch for the persistent default-controls preference; manual close applies only to the current video.

Use one fixed-width Start/Stop/Update loop button at the right end of the form, immediately before the close control. Do not show a secondary stop action. Editing or dragging must not change the panel size or move the slider.

Align the time fields and main button on one grid. Labels and current-position actions share a fixed-height row so the input bottoms and primary button stay aligned.

The popup reads the active YouTube tab’s actual dark attribute and follows it automatically, including theme changes while open. Dark mode uses the on-page panel’s charcoal, pale text, and peach accent palette; all fields, buttons, errors, and the preference switch must use theme tokens.

Set the popup root to an explicit 340px width so the browser cannot add intrinsic horizontal space. The header’s sun/moon control overrides the automatically detected theme for the current popup session; reopening follows YouTube again.
