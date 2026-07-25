/**
 * Small compatibility layer so the store components can use familiar
 * router primitives while the app runs on TanStack Router.
 */
import {
  Link as TanstackLink,
  useNavigate as useTanstackNavigate,
  useParams as useTanstackParams,
  useRouterState,
} from "@tanstack/react-router";
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  children?: ReactNode;
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, children, ...rest },
  ref,
) {
  // Hash-only / external links stay plain anchors.
  if (!to || to.startsWith("#") || to.startsWith("http") || to.startsWith("mailto:")) {
    return (
      <a ref={ref} href={to || "#"} {...rest}>
        {children}
      </a>
    );
  }

  const [pathname, search] = to.split("?");
  const searchObj = search
    ? Object.fromEntries(new URLSearchParams(search).entries())
    : undefined;

  const LooseLink = TanstackLink as unknown as React.ComponentType<
    Record<string, unknown>
  >;

  return (
    <LooseLink ref={ref} to={pathname} search={searchObj} {...rest}>
      {children}
    </LooseLink>
  );
});

export function useNavigate() {
  const navigate = useTanstackNavigate();
  return (to: string | number) => {
    if (typeof to === "number") {
      if (typeof window !== "undefined") window.history.go(to);
      return;
    }
    const [pathname, search] = to.split("?");
    navigate({
      to: pathname as never,
      search: (search
        ? Object.fromEntries(new URLSearchParams(search).entries())
        : undefined) as never,
    });
  };
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
  return useTanstackParams({ strict: false }) as T;
}

export function useLocation() {
  return useRouterState({ select: (s) => s.location });
}

/** Mirrors the `[params, setParams]` tuple shape used by the store pages. */
export function useSearchParams(): [
  URLSearchParams,
  (next: Record<string, string>) => void,
] {
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const navigate = useTanstackNavigate();
  const params = new URLSearchParams(searchStr ?? "");

  const setSearchParams = (next: Record<string, string>) => {
    navigate({ to: ".", search: next as never });
  };

  return [params, setSearchParams];
}
