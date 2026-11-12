import * as Dialog from "@radix-ui/react-dialog";
import { X, Layers } from "lucide-react";
import { useRef, type ReactNode } from "react";
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className={`modal ${wide ? "wide" : ""} ${className}`}
          onOpenAutoFocus={() => {
            opener.current = document.activeElement as HTMLElement;
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (opener.current?.isConnected) opener.current.focus();
          }}
        >
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {description || "Explore the details behind this workspace."}
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function ThreadMark() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7h22M5 16h22M5 25h22M11 7v18M21 7v18"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <circle
        cx="21"
        cy="16"
        r="3.5"
        fill="var(--paper)"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <Layers size={28} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Architecture({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="How THREAD works"
      description="Define consistent metrics, examine customer journeys and decide what to validate next."
      className="how-thread"
      wide
    >
      <div className="how-thread-content">
        <div className="how-thread-workspaces">
          <section>
            <h3>Builder Studio</h3>
            <p>
              Discover an existing source or metric, preview its calculation,
              validate the definition and publish a version. Dashboards,
              applications and AI consumers can reuse that published definition;
              existing consumers stay pinned to their version.
            </p>
          </section>
          <section>
            <h3>Investigation Studio</h3>
            <p>
              Compare cohorts and conversion in Journey Analysis. Align
              reconstructed participant screens with payment and order records
              in Session Analysis. Create a brief that separates observations,
              hypotheses, missing evidence and next checks.
            </p>
          </section>
        </div>
        <section className="how-thread-bridge">
          <h3>Follow the same cohort</h3>
          <p>
            Query Group Order Completion Rate by period and payment mode, then
            choose <strong>Investigate this cohort</strong> to open the matching
            Journey Analysis filters. Curated sessions provide examples of what
            people experienced; they do not establish what caused the cohort’s
            outcome.
          </p>
        </section>
        <details>
          <summary>Metric definitions</summary>
          <p>
            Completion = distinct confirmed Group Orders ÷ distinct eligible
            groups started × 100. Confirmation requires an independent order
            record; each eligible group counts once. Preview and published
            queries share one calculation service. Published definitions are
            immutable and consumers pin explicit versions.
          </p>
        </details>
        <details>
          <summary>Platform foundations</summary>
          <p>
            The concept could build on existing catalog, quality, identity and
            metric services. Producers own source contracts; builders maintain
            definitions; consumers reuse published versions. Production
            integration would need correlated interaction and business records,
            governed access, masking, retention and auditability.
          </p>
        </details>
        <p className="how-thread-scope">
          <strong>Demo scope.</strong> Gather and its reconstructed sessions are
          synthetic; GrabFood is illustrative. Queries and structured AI
          evidence run locally. Source quality, permissions and approvals are
          simulated; drafts and metric versions reset on refresh. No Grab
          integration, capture SDK, live LLM or production access control is
          connected.
        </p>
      </div>
    </Modal>
  );
}
