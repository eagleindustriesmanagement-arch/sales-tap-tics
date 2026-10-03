# 0032: Teams with invite links, individual accounts, and admin access as a privilege

- **Context.** Ernesto (October 3):
  - Two real ways in. A manager signs up a team and sends invite links; anyone who signs up through a link joins
    that team, and the manager sees the team's practice, scores and certifications. An individual signs up alone,
    for any high-ticket sale (cars, homes, solar, furniture), tied to no dealership.
  - The separate General Manager role goes. Admin access becomes a privilege any member of a team can be given. The
    demo drops gm@demo.test.
- **Decision.**
  - **Accounts** (migration 0021): every account (tenant) is a `team` or an `individual`, with an industry (cars,
    homes, solar, furniture, other).
    - A team sign-up makes its owner the team's manager, with admin access.
    - An individual gets their own practice space and the rep's screens.
  - **Invite links:**
    - Any manager makes rep links; only admins make manager links.
    - A link is a random token shown once; only its hash is stored. Managers turn a link off and make a new one.
    - Joining goes through the same emailed code as every sign-up.
    - A link is checked again when the code is entered, so turning it off stops someone already sent a code.
    - The join page shows only the team's name and the role, for a live link.
  - **Admin access** is stored as the existing `general_manager` membership, so every access rule and its tests
    keep working unchanged. The app shows it as an "Admin access" switch on People, not as a role.
    - With it, a manager's tabs include Dashboard and Store.
    - It covers store setup, people, the dashboard, costs, usage, the audit log and export.
  - **New teams** land on Team after the notice: a welcome card, then the invite panel. Every Team page keeps the
    panel.
  - **Demo:**
    - Carlos (manager@demo.test) is the manager with admin access, so the demo shows every screen.
    - Marta becomes manager2@demo.test, a manager without it, used for the permission checks; she has no demo
      button.
    - The seed reconciles roles, so an older demo store (production) is brought up to date on the next deploy.
- **Honesty about industries.** The techniques and lessons are universal sales methods, but today's role-play
  customers are car buyers.
  - An individual or team in another industry sees a note on Today saying their industry's customers are coming,
    and that the techniques can be practiced now with the car customers.
  - Building customers for homes, solar and furniture is the next content milestone.
- **Not yet.** One team per person (an email belongs to one account); no billing (decision pending on pricing); a
  person who already has an account and opens another team's link simply signs in to their own.
