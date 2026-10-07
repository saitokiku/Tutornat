// Stub for next/link so the snapshot's real Button/AppFooter components bundle
// outside Next.js. Renders a plain anchor; no routing.
export default function Link({ href, children, ...rest }) {
  return <a href={typeof href === 'string' ? href : '#'} {...rest}>{children}</a>;
}
