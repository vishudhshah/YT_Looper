# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Product Purpose
A Chrome extension that repeats a user-defined start-to-stop range in the current YouTube video. The requested priorities are simple functionality, usability, and good UI/UX.

## Operating Context
The user watches a YouTube video and chooses the segment to repeat.

## Capabilities and Constraints
The range must be editable. Playback must return to the start when it reaches the stop time.

## Implementation Assumptions
The user initially confirmed a compact toolbar popup and subsequently requested controls shown automatically on the YouTube page, with an option to hide them. The popup remains an alternate interface. Plain HTML, CSS, and JavaScript minimize setup and dependencies. Live streams are outside the first version. The loop lasts for the current page session and stops on navigation to another video. These are implementation choices, not additional user requirements.
