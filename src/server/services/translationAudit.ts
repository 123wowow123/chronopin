// The translation health check's SQL (the same checks as
// .agents/skills/prod-translations/scripts/check_translations.py), run on the
// server so an agent without SSH to the VM can still audit production:
// GET /api/admin/translations/audit (src/app/api/admin/translations/audit).
// Every statement is fixed text and read-only; the only input is the number of
// days that narrows the slow bullets check, which is validated as an integer.

import * as db from '../db';

const COUNTS_SQL = `SELECT row_to_json(q)::text FROM (SELECT 
    (SELECT count(*) FROM "Pin" WHERE "utcDeletedDateTime" IS NULL) AS active_pins,
    (SELECT count(*) FROM "PinTranslation" pt JOIN "Pin" p ON p.id = pt."pinId" WHERE p."utcDeletedDateTime" IS NULL) AS total_translation_rows,
    (SELECT count(*) FROM "PinTranslation" pt LEFT JOIN "Pin" p ON p.id = pt."pinId" WHERE p.id IS NULL OR p."utcDeletedDateTime" IS NOT NULL) AS orphaned_translation_rows
) q;`;

const LEAK_PIN_SQL = `WITH leak_patterns AS (
  SELECT unnest(ARRAY[
    '%Translations completed using Gemini%',
    '%Traducciones completadas usando Gemini%',
    '%Traductions réalisées avec Gemini%',
    '%Übersetzungen wurden mit Gemini%',
    '%翻訳は Gemini%',
    '%使用 Gemini%完成翻译%',
    '%Gemini%를 사용하여 번역이%',
    '%जेमिनी%का उपयोग करके अनुवाद%',
    '%اكتملت الترجمات باستخدام Gemini%',
    '%การแปลเสร็จสมบูรณ์โดยใช้ Gemini%',
    '%Traduzioni completate utilizzando Gemini%',
    '%Переводы выполнены с использованием Gemini%',
    '%Traduções concluídas usando Gemini%',
    '%Terjemahan selesai menggunakan Gemini%',
    '%Bản dịch được hoàn thành bằng cách sử dụng Gemini%',
    '%Terjemahan diselesaikan menggunakan Gemini%'
  ]) AS pat
)
SELECT row_to_json(q)::text FROM (SELECT 
    (SELECT count(*) FROM "Pin" p WHERE p."utcDeletedDateTime" IS NULL AND (
      ((p."longFormSummary" ILIKE '%gemini%' OR p."longFormSummary" LIKE '%जेमिनी%')
        AND EXISTS (SELECT 1 FROM leak_patterns lp WHERE p."longFormSummary" ILIKE lp.pat)) OR ((p.description ILIKE '%gemini%' OR p.description LIKE '%जेमिनी%')
        AND EXISTS (SELECT 1 FROM leak_patterns lp WHERE p.description ILIKE lp.pat))
      OR EXISTS (SELECT 1 FROM "PinProTip" t WHERE t."pinId" = p.id AND ((t.tip ILIKE '%gemini%' OR t.tip LIKE '%जेमिनी%')
        AND EXISTS (SELECT 1 FROM leak_patterns lp WHERE t.tip ILIKE lp.pat)))
    )) AS pins_with_content_tracking
) q;`;

const LEAK_TRANSLATION_SQL = `WITH leak_patterns AS (
  SELECT unnest(ARRAY[
    '%Translations completed using Gemini%',
    '%Traducciones completadas usando Gemini%',
    '%Traductions réalisées avec Gemini%',
    '%Übersetzungen wurden mit Gemini%',
    '%翻訳は Gemini%',
    '%使用 Gemini%完成翻译%',
    '%Gemini%를 사용하여 번역이%',
    '%जेमिनी%का उपयोग करके अनुवाद%',
    '%اكتملت الترجمات باستخدام Gemini%',
    '%การแปลเสร็จสมบูรณ์โดยใช้ Gemini%',
    '%Traduzioni completate utilizzando Gemini%',
    '%Переводы выполнены с использованием Gemini%',
    '%Traduções concluídas usando Gemini%',
    '%Terjemahan selesai menggunakan Gemini%',
    '%Bản dịch được hoàn thành bằng cách sử dụng Gemini%',
    '%Terjemahan diselesaikan menggunakan Gemini%'
  ]) AS pat
)
SELECT row_to_json(q)::text FROM (SELECT 
    (SELECT count(*) FROM "PinTranslation" pt JOIN "Pin" p ON p.id = pt."pinId" WHERE p."utcDeletedDateTime" IS NULL
      AND (((pt."longFormSummary" ILIKE '%gemini%' OR pt."longFormSummary" LIKE '%जेमिनी%')
        AND EXISTS (SELECT 1 FROM leak_patterns lp WHERE pt."longFormSummary" ILIKE lp.pat)) OR ((pt.description ILIKE '%gemini%' OR pt.description LIKE '%जेमिनी%')
        AND EXISTS (SELECT 1 FROM leak_patterns lp WHERE pt.description ILIKE lp.pat))))
    + (SELECT count(*) FROM "PinProTipTranslation" ptt JOIN "PinProTip" t ON t.id = ptt."proTipId" JOIN "Pin" p ON p.id = t."pinId"
      WHERE p."utcDeletedDateTime" IS NULL AND ((ptt.tip ILIKE '%gemini%' OR ptt.tip LIKE '%जेमिनी%')
        AND EXISTS (SELECT 1 FROM leak_patterns lp WHERE ptt.tip ILIKE lp.pat))) AS translations_with_content_tracking
) q;`;

const MANGLED_SQL = `SELECT row_to_json(q)::text FROM (SELECT 
    (SELECT count(*) FROM "PinTranslation" pt JOIN "Pin" p ON p.id = pt."pinId" WHERE p."utcDeletedDateTime" IS NULL AND (
      (length(regexp_replace(coalesce(p.description, ''), '<[^>]*>', '', 'g')) > 40 AND pt.description = p.description AND regexp_replace(coalesce(p.description, ''), '<[^>]*>', '', 'g') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
      OR (length(regexp_replace(coalesce(p."longFormSummary", ''), '<[^>]*>', '', 'g')) > 60 AND pt."longFormSummary" = p."longFormSummary" AND regexp_replace(coalesce(p."longFormSummary", ''), '<[^>]*>', '', 'g') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
      OR (length(coalesce(p."dateConfidenceReasoning", '')) > 40 AND pt."dateConfidenceReasoning" = p."dateConfidenceReasoning" AND coalesce(p."dateConfidenceReasoning", '') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
      OR (length(coalesce(p."delayReasoning", '')) > 40 AND pt."delayReasoning" = p."delayReasoning" AND coalesce(p."delayReasoning", '') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
      OR coalesce(pt.title, '') ~ '&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+|ldquo|rdquo|laquo|raquo|ndash|atilde);'
      OR coalesce(pt."dateConfidenceReasoning", '') ~ '&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+|ldquo|rdquo|laquo|raquo|ndash|atilde);'
      OR coalesce(pt."delayReasoning", '') ~ '&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+|ldquo|rdquo|laquo|raquo|ndash|atilde);'
      OR coalesce(pt.description, '') ~ '(&amp;(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+);|&amp;;|&lt;;|&gt;;|([^&a-zA-Z]|^)(amp|quot);|＆amp;)'
      OR coalesce(pt."longFormSummary", '') ~ '(&amp;(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+);|&amp;;|&lt;;|&gt;;|([^&a-zA-Z]|^)(amp|quot);|＆amp;)'
      OR coalesce(pt.title, '') ~ '[⟦⟧]'
      OR coalesce(pt.description, '') ~ '[⟦⟧]'
      OR coalesce(pt."longFormSummary", '') ~ '[⟦⟧]'
      OR coalesce(pt."dateConfidenceReasoning", '') ~ '[⟦⟧]'
      OR coalesce(pt."delayReasoning", '') ~ '[⟦⟧]'
      OR (
        pt.locale IN ('ja', 'zh', 'ko', 'ru', 'ar', 'hi', 'th')
        AND (
          (length(regexp_replace(coalesce(pt."longFormSummary", ''), '<[^>]*>', '', 'g')) > 60 AND regexp_replace(coalesce(pt."longFormSummary", ''), '<[^>]*>', '', 'g') !~ '[^\\x00-\\x7F]' OR regexp_replace(coalesce(pt."longFormSummary", ''), '<cite[^>]*></cite>', '', 'g') ~ '<li>[\\x20-\\x7E]{80,}</li>')
          OR (length(regexp_replace(coalesce(pt.description, ''), '<[^>]*>', '', 'g')) > 40 AND regexp_replace(coalesce(pt.description, ''), '<[^>]*>', '', 'g') !~ '[^\\x00-\\x7F]')
          OR (length(coalesce(pt.title, '')) > 40 AND coalesce(pt.title, '') !~ '[^\\x00-\\x7F]' AND coalesce(p.title, '') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
        )
      )
      OR (
        pt.locale = 'th'
        AND (
          coalesce(pt.title, '') || ' ' || coalesce(pt.description, '') || ' ' || coalesce(pt."longFormSummary", '') || ' ' || coalesce(pt."dateConfidenceReasoning", '') || ' ' || coalesce(pt."delayReasoning", '') ~ 'พ\\.ศ\\.'
          OR (
            coalesce(pt.title, '') || ' ' || coalesce(pt.description, '') || ' ' || coalesce(pt."longFormSummary", '') || ' ' || coalesce(pt."dateConfidenceReasoning", '') || ' ' || coalesce(pt."delayReasoning", '') ~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)'
            AND replace(coalesce(p.title, '') || ' ' || coalesce(p.description, '') || ' ' || coalesce(p."longFormSummary", '') || ' ' || coalesce(p."dateConfidenceReasoning", '') || ' ' || coalesce(p."delayReasoning", ''), ',', '') !~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)'
          )
        )
      )
    )) AS untranslated_or_mangled_rows
) q;`;

const BULLETS_SQL = `SELECT row_to_json(q)::text FROM (SELECT 
    (SELECT count(*) FROM (SELECT DISTINCT b."pinId", b.locale FROM (
  SELECT pt."pinId", pt.locale,
         regexp_replace(e.li, '<[^>]*>', '', 'g') AS en_li,
         regexp_replace(t.li, '<[^>]*>', '', 'g') AS tr_li
  FROM "PinTranslation" pt
  JOIN "Pin" p ON p.id = pt."pinId" AND p."utcDeletedDateTime" IS NULL
  CROSS JOIN LATERAL regexp_split_to_table(coalesce(p."longFormSummary", ''), '</li>') WITH ORDINALITY AS e(li, n)
  JOIN LATERAL (SELECT li, n FROM regexp_split_to_table(coalesce(pt."longFormSummary", ''), '</li>') WITH ORDINALITY AS x(li, n)) t ON t.n = e.n
  WHERE p."longFormSummary" ~ '<li>' /*SINCE*/
) b WHERE length(en_li) >= 60 AND en_li = tr_li AND en_li !~ '[^\\x00-\\x7F]' AND en_li ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M') x) AS identical_english_bullet_rows
) q;`;

const PANELS_SQL = `WITH panel_items AS (
  SELECT pp."pinId",
         (SELECT count(*) FROM unnest(ARRAY['es','fr','de','ja','zh','ko','hi','ar','th','it','ru','pt','ms','vi','id']) loc
          WHERE (c->'i18n'->loc->>'title') IS NOT NULL AND (c->'i18n'->loc->>'unit') IS NOT NULL
            AND NOT (loc IN ('ja','zh','ko','ru','ar','hi','th') AND length(coalesce(c->>'title', '')) > 40 AND (c->>'title') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M' AND coalesce(c->'i18n'->loc->>'title', '') !~ '[^\\x00-\\x7F]')
            AND (c->>'note' IS NULL OR (
              (c->'i18n'->loc->>'note') IS NOT NULL
              AND NOT (length(regexp_replace(c->>'note', '<[^>]*>', '', 'g')) > 40 AND regexp_replace(c->>'note', '<[^>]*>', '', 'g') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M' AND (regexp_replace(c->'i18n'->loc->>'note', '<[^>]*>', '', 'g') = regexp_replace(c->>'note', '<[^>]*>', '', 'g') OR (loc IN ('ja','zh','ko','ru','ar','hi','th') AND regexp_replace(c->'i18n'->loc->>'note', '<[^>]*>', '', 'g') !~ '[^\\x00-\\x7F]')))
            ))
            AND NOT (loc = 'th' AND (c->'i18n'->'th')::text ~ 'พ\\.ศ\\.|(^|[^0-9])25[5-8][0-9]([^0-9]|$)')
            AND NOT ((c->'i18n'->loc)::text ~ '&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+);')) AS locales_done
  FROM "PinPerf" pp
  JOIN "Pin" p ON p.id = pp."pinId" AND p."utcDeletedDateTime" IS NULL
  CROSS JOIN LATERAL jsonb_array_elements(pp.charts) c
  UNION ALL
  SELECT pp."pinId",
         (SELECT count(*) FROM unnest(ARRAY['es','fr','de','ja','zh','ko','hi','ar','th','it','ru','pt','ms','vi','id']) loc
          WHERE (t->'i18n'->loc->>'title') IS NOT NULL
            AND NOT (loc IN ('ja','zh','ko','ru','ar','hi','th') AND length(coalesce(t->>'title', '')) > 40 AND (t->>'title') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M' AND coalesce(t->'i18n'->loc->>'title', '') !~ '[^\\x00-\\x7F]')
            AND jsonb_array_length(coalesce(t->'i18n'->loc->'columns', '[]'::jsonb)) = jsonb_array_length(coalesce(t->'columns', '[]'::jsonb))
            AND jsonb_array_length(coalesce(t->'i18n'->loc->'rows', '[]'::jsonb)) = jsonb_array_length(coalesce(t->'rows', '[]'::jsonb))
            AND NOT EXISTS (
              SELECT 1
              FROM jsonb_array_elements(coalesce(t->'rows', '[]'::jsonb)) WITH ORDINALITY AS er(erow, r_idx)
              CROSS JOIN LATERAL jsonb_array_elements_text(er.erow) WITH ORDINALITY AS ec(ecell, c_idx)
              WHERE (
                length(regexp_replace(ec.ecell, '<[^>]*>', '', 'g')) > 40
                AND regexp_replace(ec.ecell, '<[^>]*>', '', 'g') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M'
                AND (
                  regexp_replace(coalesce((t->'i18n'->loc->'rows'->(er.r_idx::int - 1)) ->> (ec.c_idx::int - 1), ''), '<[^>]*>', '', 'g') = regexp_replace(ec.ecell, '<[^>]*>', '', 'g')
                  OR (loc IN ('ja','zh','ko','ru','ar','hi','th') AND regexp_replace(coalesce((t->'i18n'->loc->'rows'->(er.r_idx::int - 1)) ->> (ec.c_idx::int - 1), ''), '<[^>]*>', '', 'g') !~ '[^\\x00-\\x7F]')
                )
              )
              OR (length(ec.ecell) - length(replace(ec.ecell, '<cite', '')))
              != (length(coalesce((t->'i18n'->loc->'rows'->(er.r_idx::int - 1)) ->> (ec.c_idx::int - 1), '')) - length(replace(coalesce((t->'i18n'->loc->'rows'->(er.r_idx::int - 1)) ->> (ec.c_idx::int - 1), ''), '<cite', '')))
            )
            AND (t->>'note' IS NULL OR (
              (t->'i18n'->loc->>'note') IS NOT NULL
              AND NOT (length(regexp_replace(t->>'note', '<[^>]*>', '', 'g')) > 40 AND regexp_replace(t->>'note', '<[^>]*>', '', 'g') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M' AND (regexp_replace(t->'i18n'->loc->>'note', '<[^>]*>', '', 'g') = regexp_replace(t->>'note', '<[^>]*>', '', 'g') OR (loc IN ('ja','zh','ko','ru','ar','hi','th') AND regexp_replace(t->'i18n'->loc->>'note', '<[^>]*>', '', 'g') !~ '[^\\x00-\\x7F]')))
            ))
            AND NOT (loc = 'th' AND (t->'i18n'->'th')::text ~ 'พ\\.ศ\\.|(^|[^0-9])25[5-8][0-9]([^0-9]|$)')
            AND NOT ((t->'i18n'->loc)::text ~ '&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+);')
            AND (t->'stages' IS NULL OR jsonb_array_length(coalesce(t->'i18n'->loc->'stages', '[]'::jsonb)) = jsonb_array_length(t->'stages'))) AS locales_done
  FROM "PinPerf" pp
  JOIN "Pin" p ON p.id = pp."pinId" AND p."utcDeletedDateTime" IS NULL
  CROSS JOIN LATERAL jsonb_array_elements(pp.tables) t
),
panel_counts AS (
  SELECT
    count(*) AS total_panels,
    count(*) FILTER (WHERE locales_done = 15) AS panels_complete,
    count(*) FILTER (WHERE locales_done < 15) AS panels_incomplete,
    count(DISTINCT "pinId") FILTER (WHERE locales_done < 15) AS pins_with_incomplete_panels
  FROM panel_items
)
SELECT row_to_json(panel_counts)::text FROM panel_counts;`;

const PRO_TIPS_SQL = `WITH pro_tip_items AS (
  SELECT t.id AS "proTipId",
         t."pinId",
         (SELECT count(*) FROM "PinProTipTranslation" ptt
          WHERE ptt."proTipId" = t.id
            AND btrim(ptt."sourceHash") = encode(digest(t.tip, 'sha1'), 'hex')
            AND length(btrim(ptt.tip)) > 0
            AND length(ptt.tip) <= 1500
            AND NOT (length(t.tip) > 40 AND ptt.tip = t.tip AND t.tip ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
            AND NOT (ptt.locale IN ('ja','zh','ko','ru','ar','hi','th') AND length(t.tip) > 40 AND t.tip ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M' AND ptt.tip !~ '[^\\x00-\\x7F]')
            AND NOT (ptt.locale = 'th' AND (ptt.tip ~ 'พ\\.ศ\\.' OR (ptt.tip ~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)' AND replace(t.tip, ',', '') !~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)')))
            AND NOT (ptt.tip ~ '&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+|ldquo|rdquo|laquo|raquo|ndash|atilde);')
            AND NOT (ptt.tip ~ '[⟦⟧]')
         ) AS locales_done
  FROM "PinProTip" t
  JOIN "Pin" p ON p.id = t."pinId" AND p."utcDeletedDateTime" IS NULL
),
pro_tip_counts AS (
  SELECT
    count(*) AS total_pro_tips,
    count(*) FILTER (WHERE locales_done = 15) AS pro_tips_complete,
    count(*) FILTER (WHERE locales_done < 15) AS pro_tips_incomplete,
    count(DISTINCT "pinId") FILTER (WHERE locales_done < 15) AS pins_with_incomplete_pro_tips
  FROM pro_tip_items
)
SELECT row_to_json(pro_tip_counts)::text FROM pro_tip_counts;`;

export const AUDIT_CHECKS = ['counts', 'leak_pin', 'leak_translation', 'mangled', 'bullets', 'panels', 'pro_tips'] as const;
export type AuditCheck = (typeof AUDIT_CHECKS)[number];

const SQL: Record<AuditCheck, string> = {
  counts: COUNTS_SQL,
  leak_pin: LEAK_PIN_SQL,
  leak_translation: LEAK_TRANSLATION_SQL,
  mangled: MANGLED_SQL,
  bullets: BULLETS_SQL,
  panels: PANELS_SQL,
  pro_tips: PRO_TIPS_SQL,
};

export type AuditResult = { check: AuditCheck; ms: number; data: Record<string, number> };

// Runs one check. sinceDays (a whole number) limits bullets to translation rows
// written in the last N days, as the script's --since-days does; the other checks
// always scan everything.
export async function runAuditCheck(check: AuditCheck, sinceDays?: number): Promise<AuditResult> {
  let text = SQL[check];
  if (check === 'bullets') {
    const since = Number.isInteger(sinceDays) && (sinceDays as number) > 0
      ? `AND pt."utcUpdatedDateTime" >= now() - interval '${sinceDays} days'`
      : '';
    text = text.replace('/*SINCE*/', since);
  }
  const started = Date.now();
  const rows = await db.query<{ json: string }>(text);
  const first = rows[0] ? Object.values(rows[0])[0] : null;
  const data = (typeof first === 'string' ? JSON.parse(first) : first) as Record<string, number> | null;
  return { check, ms: Date.now() - started, data: data ?? {} };
}
