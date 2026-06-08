# Fix slow Notes load on the Today view

Notes took ~a minute to appear. Cause: 003 made the page await the task query before
rendering, coupling notes to it. Fix: render on the note alone; the task rail hydrates
client-side (non-blocking). Pulled out of 012 to ship immediately.
