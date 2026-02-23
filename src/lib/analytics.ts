type EventName =
  | 'view_home'
  | 'search'
  | 'filter_apply'
  | 'view_product'
  | 'add_to_favorites'
  | 'start_sell_flow'
  | 'submit_listing'
  | 'bid_place'
  | 'bid_confirm'
  | 'buy_now_click'
  | 'checkout_start'
  | 'purchase_complete'
  | 'contact_seller'
  | 'report_listing'
  | 'admin_approve_listing'
  | 'admin_reject_listing'
  | 'promo_click';

export function trackEvent(event: EventName, data?: Record<string, unknown>) {
  console.log(`[Kolecta Analytics] ${event}`, data);

  // Integration point: send to your analytics provider
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, data);
  }
}
