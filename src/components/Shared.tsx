import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowRight, Check, Layers, MousePointer2 } from "lucide-react";
import type { ReactNode } from "react";
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className={`modal ${wide ? "wide" : ""}`}>
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
      title="Follow the thread."
      description="From a design decision to a grounded investigation."
      wide
    >
      <div className="architecture-intro">
        A replay shows the experience.
        <br />
        <span>Connected records explain the outcome.</span>
      </div>
      <div className="architecture-flow">
        {[
          "Product design",
          "Built-in instrumentation",
          "Interaction + business events",
          "Trusted definitions",
          "Journey analytics",
          "Evidence Investigator",
        ].map((s, i) => (
          <div key={s}>
            <span className="step-number">0{i + 1}</span>
            <strong>{s}</strong>
            {i < 5 && <ArrowRight size={16} />}
          </div>
        ))}
      </div>
      <div className="architecture-grid">
        <div>
          {[
            [
              "SDK & instrumentation",
              "Components emit meaningful interactions with session, participant, group and request IDs. Backend events independently record acceptance or failure. This demo reconstructs states; it does not capture real users.",
            ],
            [
              "Data Mesh",
              "The marketplace team owns Group Orders; payments owns authorization outcomes. Stable identifiers let these data products serve a shared investigation without erasing their ownership.",
            ],
            [
              "Medallion architecture",
              "Raw events retain original timestamps. A cleaned layer deduplicates and joins identities; curated group-level records power the funnel. These are conceptual boundaries, not deployed data pipelines.",
            ],
            [
              "Semantic layer",
              "Completion = distinct confirmed Group Orders ÷ distinct groups created in the selected creation cohort. Steps are ordered and counted once per group. Recent means October 15–28; previous means October 1–14, 2026. All sample groups have reached a terminal state.",
            ],
          ].map(([title, text]) => (
            <details key={title}>
              <summary>{title}</summary>
              <p>{text}</p>
            </details>
          ))}
        </div>
        <div className="instrumentation">
          <div className="eyebrow">MEASUREMENT STARTS WITH DESIGN</div>
          <div className="sample-cart">
            <span>Roasted sesame bowl</span>
            <span className="sample-button">
              Add to cart <MousePointer2 size={14} />
            </span>
          </div>
          <dl>
            <dt>Interaction</dt>
            <dd>cart.add_tapped</dd>
            <dt>Application action</dt>
            <dd>POST /cart/items</dd>
            <dt>Identifiers</dt>
            <dd>
              session_id · participant_id
              <br />
              group_id · request_id
            </dd>
            <dt>Funnel step</dt>
            <dd>Items added</dd>
            <dt>Business outcome</dt>
            <dd>
              <Check size={12} /> cart.item_added
            </dd>
          </dl>
          <p>
            A tap captures intent. A successful response confirms the cart
            changed.
          </p>
        </div>
      </div>
      <div className="disclosure">
        <span className="status-dot" /> Independent concept · fictional
        marketplace · synthetic data · deterministic demo investigation engine.
        No live LLM, capture SDK, or customer data.
      </div>
    </Modal>
  );
}
