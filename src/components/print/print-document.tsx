/*
 * Plain HTML for the printed form, matched to the association's original Word form
 * (NEW LIST 36.docx). Styled ONLY by src/app/print/print.css (no Tailwind).
 * Every position is laid out on a US Letter canvas (215.9 x 279.4 mm) exactly as in
 * the original; on A4 paper the same canvas is centred on the sheet.
 */
import { formatDate, formatPhone, formatRand } from "@/lib/format";
import { FORM_ADULT_ROWS, FORM_CHILD_ROWS, type PrintList, type PrintPassenger, type PrintSettings } from "@/lib/print-types";

type Column = "name" | "from" | "dest" | "phone" | "amount";

/** Characters that fit at 9 pt in each column of the original form. */
const FIT_CHARS: Record<Column, number> = { name: 38, from: 19, dest: 17, phone: 14, amount: 11 };

/** Long text shrinks step by step and only wraps as a last resort, so rows never grow. */
function fitClass(text: string, column: Column): string {
  const w = FIT_CHARS[column];
  if (text.length <= w) return "qb-fit-1";
  if (text.length <= Math.floor(w * 1.2)) return "qb-fit-2";
  if (text.length <= Math.floor(w * 1.5)) return "qb-fit-3";
  return "qb-fit-4";
}

function Cell({ column, text, prefix }: { column: Column; text?: string; prefix?: string }) {
  const value = text ?? "";
  return (
    <td>
      <div className={`qb-cell ${fitClass((prefix ?? "") + value, column)}`}>
        {prefix}
        {value}
      </div>
    </td>
  );
}

function Row({ p, prefix, child }: { p?: PrintPassenger; prefix?: string; child?: boolean }) {
  return (
    <tr className={child ? "qb-row-child" : "qb-row"}>
      <Cell column="name" text={p?.full_name} prefix={prefix} />
      <Cell column="from" text={p?.from_address} />
      <Cell column="dest" text={p?.destination_address} />
      <Cell column="phone" text={p ? formatPhone(p.next_of_kin_no) : undefined} />
      <Cell column="amount" text={p ? formatRand(p.paid_cents) : undefined} />
    </tr>
  );
}

/** Letterhead, rule and the faded watermark: identical on every page, as in the Word header. */
function PageFrame({ s, logoUrl, watermarkUrl }: { s: PrintSettings; logoUrl: string; watermarkUrl: string }) {
  return (
    <>
      <div className="qb-lh-short">{s.short_name}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="qb-lh-logo" src={logoUrl} alt="" />
      <div className="qb-lh-reg">REG. NO. {s.registration_no}</div>
      <div className="qb-lh-address">
        <div>{s.street_address}</div>
        <div>{s.town}</div>
        <div>{s.postal_code}</div>
        <div className="qb-lh-cell">Cell : {s.cell_no}</div>
        <div className="qb-lh-email">
          E-mail: <span>{s.email}</span>
        </div>
      </div>
      <div className="qb-rule" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="qb-wm-img" src={watermarkUrl} alt="" aria-hidden />
    </>
  );
}

function blank(width: string) {
  return <span className="qb-blank" style={{ width }} />;
}

/**
 * One sheet of a list. `adults` are this sheet's rows; children print on the first sheet only,
 * and later sheets carry on the numbering of the adults ("sheet 2 of 3").
 */
function ListPage({ list, adults, sheet, pageNo }: {
  list: PrintList; adults: PrintPassenger[]; sheet: { no: number; of: number }; pageNo: number;
}) {
  const { settings: s, trip } = list;
  const ownerTitle = trip && trip.owner_title !== "none" ? trip.owner_title.toUpperCase() + " " : "";
  return (
    <section className={`qb-sheet qb-paper-${s.paper_size}`}>
      <div className="qb-canvas">
        <PageFrame s={s} logoUrl={list.logoUrl} watermarkUrl={list.watermarkUrl} />
        {list.isDraft && <div className="qb-draft">DRAFT</div>}
        <div className="qb-flow">
          <div className="qb-title-line">
            <div className="qb-title">PASSENGERS LIST</div>
            <div className="qb-date">Date: {trip ? formatDate(trip.trip_date) : blank("18mm")}</div>
          </div>
          <div className="qb-contact">Contact {s.chairperson_line} and {s.secretary_line}</div>
          <div className="qb-info">
            <span>VEHICLE OWNER: {trip ? ownerTitle + trip.owner_name : blank("30mm")}</span>
            <span>VEHICLE REG. {trip ? trip.registration_no : blank("20mm")}</span>
            <span>DRIVER: {trip?.driver_name ? trip.driver_name : blank("30mm")}</span>
            <span>{trip ? trip.route_name.toUpperCase() : blank("38mm")}</span>
          </div>
          <table className="qb-table">
            <colgroup>
              <col className="qb-w-name" />
              <col className="qb-w-from" />
              <col className="qb-w-dest" />
              <col className="qb-w-phone" />
              <col className="qb-w-amount" />
            </colgroup>
            <thead>
              <tr>
                <th>NAME AND SURNAME</th>
                <th>FROM ADDRESS</th>
                <th>DESTINATION ADDRESS</th>
                <th>NEXT OF KIN CONTACT NO.</th>
                <th>PAID AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: FORM_ADULT_ROWS }, (_, i) => (
                <Row key={`a${i}`} p={adults[i]} />
              ))}
              <tr className="qb-child-head">
                <td>Under 3yrs Old Children&rsquo;s</td>
                <td>Only 3 Children per trip</td>
                <td />
                <td />
                <td />
              </tr>
              {Array.from({ length: FORM_CHILD_ROWS }, (_, i) => (
                <Row key={`c${i}`} p={sheet.no === 1 ? list.children[i] : undefined} prefix={`${i + 1}. `} child />
              ))}
            </tbody>
          </table>
          <div className="qb-footer">
            <span>
              Queue Marshall: {trip ? <span className="qb-filled">{trip.marshal_name}</span> : "________________"}
            </span>
            <span>Drivers signature: ______________</span>
          </div>
        </div>
        {s.show_list_reference && trip && <div className="qb-ref">{trip.id.slice(0, 8).toUpperCase()}</div>}
        <div className="qb-page-no">{sheet.of > 1 ? `${pageNo} (sheet ${sheet.no} of ${sheet.of})` : pageNo}</div>
      </div>
    </section>
  );
}

/** A list's adults split into sheets of FORM_ADULT_ROWS; a list always has at least one sheet. */
function sheetsOf(list: PrintList): PrintPassenger[][] {
  const count = Math.max(1, Math.ceil(list.adults.length / FORM_ADULT_ROWS));
  return Array.from({ length: count }, (_, i) => list.adults.slice(i * FORM_ADULT_ROWS, (i + 1) * FORM_ADULT_ROWS));
}

/**
 * Every sheet has fixed row heights, so a sheet cannot overflow: a list with more than
 * FORM_ADULT_ROWS adults continues on further sheets. Page numbers run on across a batch.
 */
export function PrintDocument({ lists }: { lists: PrintList[] }) {
  const paper = lists[0]?.settings.paper_size === "a4" ? "A4" : "letter";
  let pageNo = 0;
  return (
    <div className="qb-print">
      <style>{`@page { size: ${paper} portrait; margin: 0; }`}</style>
      {lists.map((list, i) => {
        const sheets = sheetsOf(list);
        return (
          <div key={i} className="qb-list">
            {sheets.map((adults, j) => (
              <ListPage key={j} list={list} adults={adults} sheet={{ no: j + 1, of: sheets.length }} pageNo={++pageNo} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
