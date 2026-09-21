# Workshop facts

Receives a validated Workshop event from assembly. Renders a semantic definition list of Czech date, time, derived duration, and capacity, consistently on listing and detail pages. Preparing events instead show an unspecified date/duration. Shows the derived Czech weekday in parentheses beneath the date. Uses Europe/Prague timezone and includes the end date for multi-day events. Location remains in the data but is intentionally not displayed for now. Small decorative calendar, clock and people icons reinforce the visible labels. No content querying or JavaScript.

The listing uses the `columns` presentation below each workshop photo: three equal columns for date, time/duration and capacity, including ended events. Narrow screens stack each decorative icon above its label to preserve space for readable values. The detail retains the default layout.
