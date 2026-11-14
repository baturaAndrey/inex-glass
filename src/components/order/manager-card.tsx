import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ig/button";
import type { PublicManager } from "@/lib/orders/public-view";
import { OrderCard } from "./order-card";

/** Company contacts shown when no manager is assigned (from the `contacts` global). */
export interface OrderFallbackContacts {
  phone: { display: string; href: string };
  email: string;
  workHours: string;
}

const PHOTO_SIZE = 72;

function ContactLinks({
  phone,
  phoneHref,
  email,
}: {
  phone: string | null;
  phoneHref: string | null;
  email: string | null;
}) {
  if (!phone && !email) return null;
  return (
    <div className="flex flex-col gap-3 text-[16px] leading-[1.4]">
      {phone && phoneHref ? (
        <a
          href={phoneHref}
          className="text-text hover:text-primary-pressed font-medium no-underline"
        >
          {phone}
        </a>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="text-primary-pressed hover:text-primary-dark font-medium [overflow-wrap:anywhere] no-underline"
        >
          {email}
        </a>
      ) : null}
    </div>
  );
}

/**
 * «Ваш менеджер» (sidebar): photo or a neutral circle, name, position («Менеджер по заказам»
 * by default), phone, e-mail, «Написать в мессенджер» (hidden without `messengerUrl`). Without
 * an assigned manager the card shows the company contacts instead.
 */
export function ManagerCard({
  manager,
  fallback,
}: {
  manager: PublicManager | null;
  fallback: OrderFallbackContacts;
}) {
  if (!manager) {
    return (
      <OrderCard title="Контакты" titleId="order-manager-title">
        <ContactLinks
          phone={fallback.phone.display}
          phoneHref={fallback.phone.href}
          email={fallback.email}
        />
        <span className="ig-small text-text-2">{fallback.workHours}</span>
      </OrderCard>
    );
  }

  return (
    <OrderCard title="Ваш менеджер" titleId="order-manager-title">
      <div className="flex items-center gap-4">
        {manager.photoUrl ? (
          <Image
            src={manager.photoUrl}
            alt=""
            width={PHOTO_SIZE}
            height={PHOTO_SIZE}
            className="size-[72px] flex-none rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="size-[72px] flex-none rounded-full bg-[linear-gradient(135deg,#E3ECE9,#CFDDD9)]"
          />
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[18px] leading-[1.3] font-semibold [overflow-wrap:anywhere]">
            {manager.name}
          </span>
          <span className="ig-small text-text-2">{manager.position}</span>
        </div>
      </div>
      <ContactLinks phone={manager.phone} phoneHref={manager.phoneHref} email={manager.email} />
      {manager.messengerUrl ? (
        <Button
          asChild
          variant="secondary"
          block
          leftIcon={<MessageCircle aria-hidden="true" strokeWidth={2} />}
        >
          <a href={manager.messengerUrl} target="_blank" rel="noopener noreferrer">
            Написать в мессенджер
          </a>
        </Button>
      ) : null}
    </OrderCard>
  );
}
