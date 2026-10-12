<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the platform's TanStack route bootstrap; implement new experience modules in JavaScript/JSX with React and native controls to avoid additional UI dependencies.
- Keep public content and admin collections in one React provider above both screens so edits survive navigation but reset on refresh.
- Use a unified image inventory whose stable IDs are referenced directly by public sections and admin editors to prevent disconnected image changes.
