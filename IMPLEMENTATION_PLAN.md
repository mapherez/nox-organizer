# NoX Organizer — Product Spec v1

## 1. Product overview
**NoX Organizer** is a self-hosted, single-user, responsive web app for organizing:

- current projects
- new project ideas
- improvement ideas
- a work queue
- dependencies between projects and ideas

The app must be:
- clean
- fast
- usable on desktop, tablet, and mobile
- minimal in scope
- focused on helping the user know:
  - what they are working on now
  - what should happen next
  - what is blocked by what

The product name is **NoX Organizer**.

---

## 2. Goal
The user should be able to:

1. Add current projects.
2. Add new project ideas.
3. Link ideas to current projects when relevant.
4. Put projects and ideas into a work queue.
5. Order the work queue.
6. Define dependencies between items.
7. See which items are ready, which are blocked, and which are in progress.

---

## 3. Non-goals
The coding agent must **not** add these:

- multi-user support
- authentication / authorization
- teams
- comments
- tags
- labels
- external links
- attachments
- due dates
- reminders
- notifications
- priority levels
- effort estimates
- global search
- kanban board
- calendar view
- activity log
- analytics / dashboards
- integrations
- mobile native app
- hard delete

---

## 4. Core concepts

### 4.1 Item
The app uses one core entity: **Item**.

An item is either:
- a **Project**
- an **Idea**

This unified model keeps the app simple while still supporting dependencies between projects and ideas.

### 4.2 Project
A **Project** represents something the user is currently working on or has worked on.

Examples:
- Media Dashboard
- Homelab Inventory
- Chatbot Helper

### 4.3 Idea
An **Idea** represents:
- a possible new project
- a possible improvement to an existing project

An idea may optionally be linked to one project.

Examples:
- linked idea: “Add CSV export to Homelab Inventory”
- unlinked idea: “Build a uptime dashboard”

### 4.4 Work queue
The **work queue** contains items with status:
- `queued`
- `in_progress`

Items with status:
- `backlog`
- `done`
- `dropped`

are not part of the active queue.

### 4.5 Dependency
A dependency means:

> Item A is blocked by Item B.

Item B must be `done` or `dropped` before Item A can be moved into `in_progress`.

Dependencies can exist between:
- idea → idea
- idea → project
- project → idea
- project → project

---

## 5. Data model

### 5.1 `items`
Fields:

| Field | Type | Rules |
|---|---|---|
| `id` | string / uuid | primary key |
| `kind` | enum | `project` or `idea` |
| `title` | string | required, 1–120 chars |
| `description` | string | optional, max 5000 chars |
| `status` | enum | `backlog`, `queued`, `in_progress`, `done`, `dropped` |
| `position` | number | internal queue order |
| `linked_project_id` | nullable string / uuid | only for ideas, references another item with `kind = project` |
| `created_at` | datetime | auto |
| `updated_at` | datetime | auto |

Rules:
- If `kind = project`, `linked_project_id` must be null.
- If `kind = idea`, `linked_project_id` may reference one project item.
- `linked_project_id` must not reference the item itself.
- `position` is internal only and used for queue ordering.

### 5.2 `dependencies`
Fields:

| Field | Type | Rules |
|---|---|---|
| `id` | string / uuid | primary key |
| `item_id` | string / uuid | the dependent item |
| `prerequisite_id` | string / uuid | the item it depends on |
| `created_at` | datetime | auto |

Rules:
- `item_id` must not equal `prerequisite_id`.
- `(item_id, prerequisite_id)` must be unique.
- The dependency graph must remain acyclic.
- No hard delete of items, but dependencies can be removed.

---

## 6. Status model

### 6.1 Statuses
Use exactly these statuses:

| Status | Meaning |
|---|---|
| `backlog` | exists, but not in the active queue |
| `queued` | in the work queue, not started |
| `in_progress` | currently being worked on |
| `done` | finished |
| `dropped` | intentionally abandoned |

### 6.2 Queue membership
An item is in the active work queue if its status is:
- `queued`
- `in_progress`

### 6.3 Ready vs blocked
For an item with status `queued`:

- **Ready**  
  All of its dependencies point to items that are `done` or `dropped`.

- **Blocked**  
  At least one dependency points to an item that is `backlog`, `queued`, or `in_progress`.

For an item with status `in_progress`:
- it may still have unfinished dependencies
- the UI should show a warning, but it should not be forcibly reverted

### 6.4 Next up
The **next up** item is:
- the first `queued` item
- in `position` order
- that is **Ready**

If no queued item is ready, there is no next up item.

---

## 7. Status transitions

Allowed transitions:

| From | Allowed to |
|---|---|
| `backlog` | `queued`, `dropped` |
| `queued` | `in_progress`, `backlog`, `dropped` |
| `in_progress` | `done`, `queued`, `dropped` |
| `done` | `in_progress`, `dropped` |
| `dropped` | `backlog` |

Additional rule:
- An item **cannot** move into `in_progress` if it has any unfinished dependencies.
- It may move into `queued` even if blocked.

### Examples
- `backlog → queued` = “Add to queue”
- `queued → in_progress` = “Start”
- `in_progress → done` = “Complete”
- `queued → backlog` = “Remove from queue”
- `dropped → backlog` = “Restore”

---

## 8. Dependency behavior

### 8.1 Adding a dependency
The user can add a dependency from an item detail screen.

UI action:
- “Add dependency”
- choose another item

Meaning:
- current item is blocked by selected item

Example:
- Current item: “Add CSV export”
- Dependency: “Redesign item table”
- Meaning: “Add CSV export” is blocked by “Redesign item table”

### 8.2 Removing a dependency
The user can remove a dependency from the item detail screen.

### 8.3 Cycle prevention
The app must prevent dependency cycles.

If adding a dependency would create a cycle:
- show an error
- do not save it

Example:
- A depends on B
- user tries to make B depend on A
- reject

### 8.4 Dependency satisfaction
A dependency is satisfied if the prerequisite item is:
- `done`
- `dropped`

A dependency is unsatisfied if the prerequisite item is:
- `backlog`
- `queued`
- `in_progress`

### 8.5 Effect on queue
- A `queued` item with unsatisfied dependencies is shown as **Blocked**.
- A `queued` item with all satisfied dependencies is shown as **Ready**.
- When a prerequisite becomes `done` or `dropped`, dependents may become ready automatically.

---

## 9. Linking ideas to projects

### 9.1 Rule
- Only **ideas** can be linked to a project.
- A project cannot be linked to another project.
- One idea can be linked to **one** project only.

### 9.2 Meaning
If an idea is linked to a project, it means:
- the idea is related to that project
- it may be an improvement, enhancement, or follow-up

### 9.3 UI
In idea-related screens:
- show the linked project name if present
- if no project is linked, show a neutral label like:
  - “Standalone idea”

### 9.4 Project detail
On a project detail screen, show:
- list of ideas linked to that project

---

## 10. Converting an idea to a project

Because the app tracks both current projects and project ideas, include one simple lifecycle action:

### Action
- **Convert to project**

### Rules
- available only on items where:
  - `kind = idea`
  - `linked_project_id` is null
  - status is `backlog`, `queued`, or `in_progress`
- when performed:
  - `kind` becomes `project`
  - `linked_project_id` remains null
  - status and dependencies remain unchanged

### Purpose
This lets a standalone project idea become a real project without duplicating it.

---

## 11. Views

The app has these main views:

1. **Work Queue**
2. **Projects**
3. **Ideas**
4. **Item Detail**

The app should redirect `/` to `/queue`.

---

## 12. App shell and navigation

### 12.1 Desktop layout
On desktop:
- left sidebar navigation
- top bar with:
  - app name: **NoX Organizer**
  - theme toggle
  - primary “New” action

Sidebar items:
- Work Queue
- Projects
- Ideas

### 12.2 Tablet layout
On tablet:
- top bar remains
- sidebar may collapse into a slide-over or top navigation
- content remains usable without horizontal scrolling

### 12.3 Mobile layout
On mobile:
- bottom navigation bar with:
  - Queue
  - Projects
  - Ideas
- top bar with:
  - app name
  - theme toggle
- floating action button for “New”

### 12.4 Primary action
The primary create action should be:
- a button labeled **New**
- opens a small menu:
  - New Project
  - New Idea

On mobile:
- floating action button opens the same two choices as a bottom sheet

---

## 13. Work Queue view

This is the main view.

### 13.1 Purpose
Show the active work in a dependency-aware order.

### 13.2 Sections
Display in this order:

1. **In progress**
2. **Ready**
3. **Blocked**

#### In progress
- all items with status `in_progress`

#### Ready
- all items with status `queued`
- all dependencies satisfied
- sorted by `position`

#### Blocked
- all items with status `queued`
- at least one dependency unsatisfied
- sorted by `position`

### 13.3 Card contents
Each queue card should show:
- title
- item kind badge:
  - Project
  - Idea
- linked project name if the item is a linked idea
- dependency warning if blocked
- contextual action buttons

### 13.4 Blocked card details
For blocked items:
- show “Waiting on:”
- show the blocking item titles as small chips
- if there are many, show the first 3 and `+n more`

### 13.5 Next up highlight
- the first Ready item should be visually highlighted
- label it **Next up**

### 13.6 Reordering
The user must be able to reorder `queued` items.

Required:
- move up / move down controls on all devices

Optional but preferred on desktop:
- drag and drop

Rules:
- reordering applies to `queued` items only
- `in_progress` items are not part of the ordered queue list

### 13.7 Contextual actions
Show these actions based on status:

#### Backlog
- Add to queue
- Edit
- Drop

#### Queued
- Start
- Remove from queue
- Move up
- Move down
- Edit
- Drop

#### In progress
- Complete
- Return to queue
- Edit
- Drop

#### Done
- Reopen
- Edit
- Drop

#### Dropped
- Restore
- Edit

### 13.8 Empty states
If the queue is empty:
- show a clear empty state
- copy example:
  - “Your queue is empty.”
  - “Add a project or idea and put it in the queue.”
- show buttons:
  - New Project
  - New Idea

If there are no Ready items:
- show:
  - “No ready items. Finish dependencies or add more to the queue.”

If there are no Blocked items:
- no section is needed.

---

## 14. Projects view

### 14.1 Purpose
Show the user’s projects.

### 14.2 Filter chips
Use simple filter chips:
- Current
- Backlog
- Done
- Dropped
- All

Default filter:
- **Current**

Definitions:
- Current = `in_progress` or `queued`
- Backlog = `backlog`
- Done = `done`
- Dropped = `dropped`
- All = everything

### 14.3 List item contents
Each project row/card should show:
- title
- status badge
- number of linked ideas
- updated date (relative or short date)

### 14.4 Primary action
- **New Project**

### 14.5 Empty state
If no current projects:
- “No current projects.”
- button:
  - New Project

---

## 15. Ideas view

### 15.1 Purpose
Show all ideas.

### 15.2 Filter chips
Use:
- All
- Backlog
- Queued
- In progress
- Done
- Dropped

Default:
- **All**

### 15.3 List item contents
Each idea row/card should show:
- title
- status badge
- linked project name if linked
- if unlinked, show:
  - “Standalone idea”

### 15.4 Primary action
- **New Idea**

### 15.5 Empty state
If no ideas:
- “No ideas yet.”
- button:
  - New Idea

---

## 16. Item detail view

This is shared by projects and ideas.

### 16.1 Header
Show:
- back navigation
- title
- kind badge:
  - Project / Idea
- status badge

### 16.2 Primary status actions
Show contextual buttons based on current status, same logic as queue cards.

### 16.3 Description
Show the item description.
If empty:
- show placeholder text like:
  - “No description yet.”

### 16.4 Project link section
If the item is an **idea**:
- show current linked project, if any
- allow:
  - change linked project
  - unlink project

If the item is a **project**:
- do not show a link selector

### 16.5 Linked ideas section
If the item is a **project**:
- show list of ideas linked to this project
- each idea shows:
  - title
  - status

### 16.6 Dependencies section
Show:
- **Blocked by**
  - list of prerequisite items
- **Blocks**
  - list of dependent items
- action:
  - Add dependency
- each dependency row has:
  - item title
  - remove action

### 16.7 Add dependency
- opens a picker
- lists selectable items
- excludes:
  - the current item
- selecting one creates the dependency
- if cycle would occur:
  - show inline error

### 16.8 Convert to project
If applicable:
- show action:
  - Convert to project
- follow rules from section 10

---

## 17. Create and edit flows

### 17.1 New Project
Modal or sheet:

Fields:
- Title (required)
- Description (optional)

Behavior:
- creates an item with:
  - `kind = project`
  - `status = in_progress`
- closes after save
- shows toast:
  - “Project created”

### 17.2 New Idea
Modal or sheet:

Fields:
- Title (required)
- Description (optional)
- Link to project (optional)

Behavior:
- creates an item with:
  - `kind = idea`
  - `status = backlog`
- if a project is selected:
  - set `linked_project_id`
- closes after save
- shows toast:
  - “Idea created”

### 17.3 Edit item
Modal or sheet:

Fields:
- Title (required)
- Description (optional)
- if idea:
  - Link to project (optional)

Behavior:
- saves changes
- shows toast:
  - “Updated”

---

## 18. Theming

### 18.1 Modes
Support:
- System
- Light
- Dark

Default:
- **System**

### 18.2 UI
- theme toggle in top bar
- user can cycle or choose from a small menu

### 18.3 Persistence
- persist user preference in `localStorage`
- apply theme without visible flash if possible

---

## 19. Responsive and UX requirements

### 19.1 General
The app must feel native and comfortable on:
- desktop
- tablet
- mobile

### 19.2 Layout rules
- no horizontal scrolling on normal content widths
- touch targets large enough for mobile
- modals become full-screen sheets on small screens
- lists remain scannable on narrow screens

### 19.3 Interaction rules
- primary actions should be visible without scrolling when possible
- status actions should be obvious and consistent
- destructive or abandoning actions like **Drop** should be visually secondary
- all important state changes should give immediate feedback

### 19.4 Feedback
Use toasts for:
- create
- update
- status change
- dependency added / removed
- drop / restore
- validation errors

### 19.5 Accessibility
- keyboard navigable
- visible focus states
- labeled controls
- sufficient color contrast
- reorder controls usable without drag and drop

---

## 20. Validation rules

### 20.1 Title
- required
- trim whitespace
- max 120 characters

### 20.2 Description
- optional
- max 5000 characters

### 20.3 Linked project
- must be a project item
- cannot be the same item
- if invalid, show error

### 20.4 Dependencies
- cannot depend on self
- cannot create a cycle
- duplicate dependency not allowed

---

## 21. Suggested tech stack

Use this stack unless you explicitly change it:

### Frontend
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- next-themes

### Data / backend
- SQLite
- Prisma ORM

### Forms / validation
- react-hook-form
- zod

### Optional UI helper
- @dnd-kit if drag-and-drop is implemented

### Deployment
- Docker
- Docker Compose

---

## 22. Recommended project structure

A reasonable structure:

```text
app/
  queue/
  projects/
  ideas/
  items/
    [id]/
components/
  layout/
  queue/
  projects/
  ideas/
  items/
  ui/
lib/
  db/
  domain/
  actions/
prisma/
  schema.prisma
```

The coding agent may adjust structure, but the public views must match this spec.

---

## 23. Suggested API / actions

Use either Next.js Server Actions or API routes. The behavior must be equivalent.

### Items
- list items
- create item
- update item
- change item status
- convert idea to project
- reorder queued items

### Dependencies
- add dependency
- remove dependency

### Example route shape
```text
GET    /api/items
POST   /api/items
PATCH  /api/items/:id
POST   /api/items/:id/status
POST   /api/items/:id/convert-to-project
POST   /api/items/reorder
POST   /api/items/:id/dependencies
DELETE /api/dependencies/:id
```

---

## 24. Queue ordering implementation

Use a simple ordering strategy:

- store `position` as a floating-point number
- when reordering, assign a new position between neighbors
- if precision becomes an issue, renormalize positions for queued items

The exact internal method is up to the coding agent, but:
- queue order must persist
- order must update immediately in the UI

---

## 25. Deployment

### Docker
Provide:
- `Dockerfile`
- `docker-compose.yml`

### Environment
- `DATABASE_URL`
- `NODE_ENV`

### Data
- store SQLite database in a Docker volume
- example path:
  - `/data/nox.db`

### Goal
The app should be deployable with one command, for example:
```bash
docker compose up -d
```

---

## 26. Empty states

The app must have useful empty states.

### Queue
- “Your queue is empty.”
- “Add a project or idea and put it in the queue.”

### Projects
- “No current projects.”
- “Add your first project to start tracking work.”

### Ideas
- “No ideas yet.”
- “Capture a new project idea or improvement.”

### Item detail — no dependencies
- “No dependencies.”

### Project detail — no linked ideas
- “No linked ideas yet.”

---

## 27. Error states

Show clear inline errors for:
- missing title
- invalid linked project
- dependency cycle
- attempting to start a blocked item

Examples:
- “Title is required.”
- “Cannot start: this item is blocked by unfinished dependencies.”
- “This dependency would create a cycle.”

---

## 28. Visual design direction

The UI should be:
- clean
- calm
- practical
- not decorative for its own sake

### Style
- neutral background
- surface cards with subtle borders
- rounded corners
- consistent spacing
- clear status colors

### Suggested status colors
- backlog: gray
- queued: blue
- in_progress: amber
- done: green
- dropped: muted red or neutral gray

### Badges
Use small badges for:
- Project
- Idea
- status

### Typography
- clear hierarchy
- item titles should be the most prominent element
- secondary metadata should be quieter

---

## 29. Interaction details

### 29.1 Status changes
- use explicit buttons where possible
- update UI immediately
- if action fails, revert and show error

### 29.2 Reordering
- move up / move down buttons must always work
- on desktop, drag-and-drop may be added
- after reorder, queue sections may recompute:
  - an item may move between Ready and Blocked if dependencies changed, but reorder itself should not change readiness

### 29.3 Dependency changes
- after adding/removing a dependency:
  - update queue section membership immediately
  - update “Waiting on” chips immediately

### 29.4 Linking ideas
- after linking or unlinking a project:
  - update idea list
  - update project linked ideas count

---

## 30. Definition of done for v1

The app is done when all of the following are true:

### Projects
- user can create a project
- project appears in Projects view
- project can appear in Work Queue if queued or in progress

### Ideas
- user can create an idea
- user can optionally link it to a project
- idea appears in Ideas view
- linked idea shows the project name

### Work queue
- user can move an item into the queue
- queue shows In progress, Ready, and Blocked sections
- user can reorder queued items
- next up is clearly identified

### Dependencies
- user can add a dependency
- user can remove a dependency
- cycles are prevented
- blocked items show what is blocking them
- blocked items cannot be started until dependencies are satisfied

### Lifecycle
- items can be dropped and restored
- standalone ideas can be converted to projects

### UI
- responsive on desktop, tablet, and mobile
- supports system/light/dark theme
- clean, consistent, usable UI
- helpful empty states
- useful toasts and inline errors

### Deployment
- runs locally via Docker
- persists data in SQLite

---

## 31. Acceptance criteria

### AC1: Create project
Given the app is open,
when the user creates a project,
then:
- it is saved with `kind = project`
- default status is `in_progress`
- it appears in Projects and Work Queue

### AC2: Create idea
Given the app is open,
when the user creates an idea,
then:
- it is saved with `kind = idea`
- default status is `backlog`
- it appears in Ideas

### AC3: Link idea to project
Given the user has at least one project,
when they create or edit an idea and select a project,
then:
- the idea is linked to that project
- the project page shows the linked idea

### AC4: Add to queue
Given an item is in `backlog`,
when the user selects “Add to queue”,
then:
- status becomes `queued`
- item appears in Work Queue

### AC5: Start item
Given a queued item is ready,
when the user selects “Start”,
then:
- status becomes `in_progress`
- item appears in the In progress section

### AC6: Blocked item cannot start
Given a queued item has unfinished dependencies,
when the user attempts to start it,
then:
- the action is blocked
- an error message is shown

### AC7: Dependency creation
Given two items exist,
when the user adds a dependency from A to B,
then:
- A is blocked by B
- A appears in Blocked section if queued and B is unfinished

### AC8: Cycle prevention
Given A depends on B,
when the user tries to make B depend on A,
then:
- the action fails
- a cycle error is shown

### AC9: Reordering
Given multiple queued items,
when the user reorders them,
then:
- the new order persists
- the Ready/Blocked sections update accordingly

### AC10: Theme
Given the app is open,
when the user changes the theme,
then:
- the UI updates immediately
- the preference persists after reload

### AC11: Responsive
Given the app is opened on desktop, tablet, and mobile,
then:
- all core actions are available
- layout remains usable
- no horizontal scrolling on standard widths

---

## 32. Explicit “do not build” list for the coding agent
Do **not** implement:
- authentication
- multiple users
- tags
- labels
- links
- due dates
- reminders
- priority
- effort
- comments
- activity log
- global search
- reports
- kanban board
- calendar
- integrations
- hard delete
- custom fields

---

## 33. Final note for the coding agent
Build the smallest version that fully satisfies the spec above.

Prioritize:
1. correctness of queue + dependency logic
2. clean responsive UI
3. simple data model
4. persistence

If anything in this spec is ambiguous, choose the simplest implementation that still matches the intent, and avoid adding extra features.
