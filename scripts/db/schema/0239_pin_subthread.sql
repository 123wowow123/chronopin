-- A reply an author marks as a subthread: a shipment, a rumour, a rival
-- comparison that belongs to one pin of a thread but is not the next step of
-- its main line. The Thread pane steps such a reply in under the pin it
-- answers even when it is that pin's only response (until now only a pin with
-- two or more responses nested them), and the main line numbers on past it.
--
-- Read straight off "Pin" by the thread walk; it is not part of PinBaseView
-- or the whole-pin PUT, so an edit that omits it cannot reset it. Ignored on
-- a pin with no parent.
ALTER TABLE "Pin"
  ADD COLUMN "subthread" boolean NOT NULL DEFAULT false;
