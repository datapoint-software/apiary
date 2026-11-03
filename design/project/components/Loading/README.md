# Loading

How the app shows that something is on its way.

- **Skeleton** (`ap-skel`): grey bars where a list or panel will appear, while its first load runs. The container gets `aria-busy="true"` and `aria-label="Loading"`. Two bars are enough; never imitate the exact layout.
- **Busy button:** the button that started the work says what is happening ("Saving…", "Checking…") and is disabled with `aria-busy="true"` until it ends.
- **Spinner** (`ap-spinner`): for long operations that aren't tied to a button, next to a sentence saying what is running. It inherits the text color.
- Show nothing for the first 200 ms, so fast answers don't flash.
- Reduced motion stops the shimmer and the spin.

**The consumer provides:** where the content will appear and what is running.
