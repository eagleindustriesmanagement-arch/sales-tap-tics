"use client";

import { Component, Fragment, type ReactNode } from "react";
import { reportClientError } from "@/lib/client-error";

/**
 * Keeps a crash inside one part of a screen from taking the whole page down (decision 0027). On an error it reports
 * it, then draws its children again from scratch: fresh DOM replaces whatever was broken (for example a node that
 * a translator or an extension removed), and the state above this boundary, such as the conversation, is kept.
 * After two failed redraws it shows the fallback instead.
 */
export class Recover extends Component<{ area: string; fallback: ReactNode; children: ReactNode }, { attempt: number; failed: boolean }> {
  override state = { attempt: 0, failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error) {
    reportClientError(this.props.area, error);
    if (this.state.attempt < 2) this.setState((s) => ({ attempt: s.attempt + 1, failed: false }));
  }

  override render() {
    if (this.state.failed) return this.props.fallback;
    return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
  }
}
