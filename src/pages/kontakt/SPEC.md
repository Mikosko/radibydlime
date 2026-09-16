# Contact page

`/kontakt/` is a static, Czech contact page for readers, prospective clients, buyers, and potential collaborators. It uses the shared site shell and the existing paper, typography, and botanical assets.

The owner-confirmed public address is Tuchořice 37, 439 69 Tuchořice. Display it in the contact sidebar beneath the email, with semantic address markup and a decorative location icon.

The owner-confirmed public mailbox is `info@radibydlime.cz`. The page offers a direct email link and enquiry-specific mailto subjects. Never infer other contact details from the domain or from mockup imagery. A small client-side email composer offers optional name/email, an enquiry topic and a required message. Native validation runs before opening an encoded mailto draft in the visitor’s mail application; only the visitor sends it there. The button explicitly says “Připravit e-mail”; no success/delivery claim is made. The form keeps its text after opening the mail client, never stores it or sends it to an endpoint, and has no analytics or backend. Without JavaScript, disabled fields and a direct mailbox link remain. Do not add a consent checkbox for nonexistent website data processing or invent promised commercial services.

Header and footer links lead to this route; the header identifies it as the current page. The approved September 16 contact inspiration informs an illustrated greeting, a compact contact sidebar, a central bordered composer, a small paper note and a four-topic enquiry strip. Use existing house and botanical assets; do not copy mock telephone numbers, addresses, maps or social destinations. The columns stack in reading order at narrow widths. Decorations have empty alternative text. Email links must wrap without horizontal overflow.

The four-topic enquiry strip replaces the shared “Co u nás najdete” discovery strip through the layout’s `footer-intro` slot. It has a visible “S čím se nám můžete ozvat” heading, centered icons above editorial labels and descriptions, and responsive divided columns. Do not render both strips on Kontakt.
