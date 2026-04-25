import type { ReactNode } from "react";

export interface PreviewData {
  partyAName: string;
  partyACompany: string;
  partyAAddress: string;
  partyAEmail: string;
  partyBName: string;
  partyBCompany: string;
  partyBAddress: string;
  partyBEmail: string;
  purpose: string;
  effectiveDate: string;
  mndaTermYears: string;
  confidentialityYears: string;
  governingLaw: string;
  jurisdiction: string;
}

function Blank({ label }: { label: string }) {
  return (
    <span className="text-indigo-400 bg-indigo-50 rounded px-0.5 not-italic text-[10px]">
      {label}
    </span>
  );
}

function f(value: string, label: string): ReactNode {
  return value.trim() ? value : <Blank label={label} />;
}

function yrs(value: string, label: string): ReactNode {
  const n = parseInt(value);
  if (!value || isNaN(n) || n < 1) return <Blank label={label} />;
  return `${n} ${n === 1 ? "year" : "years"}`;
}

export function NdaPreview({ data }: { data: PreviewData }) {
  return (
    <div className="bg-white rounded-xl shadow-xl ring-1 ring-slate-200/80 max-w-[700px] mx-auto px-16 py-14 font-serif text-[11px] leading-[1.75] text-slate-800 selection:bg-indigo-100">
      {/* Title */}
      <h1 className="text-center text-[15px] font-bold uppercase tracking-[0.18em] mb-1">
        Mutual Non-Disclosure Agreement
      </h1>
      <p className="text-center text-[10px] text-slate-400 mb-10 tracking-wide">
        Based on Common Paper MNDA v1.0 · CC BY 4.0
      </p>

      {/* Cover Page */}
      <SectionHeading>Cover Page</SectionHeading>

      <div className="grid grid-cols-2 gap-x-8 mb-6">
        <div>
          <PartyHeading label="Party A" />
          <CoverRow label="Name">{f(data.partyAName, "Party A Name")}</CoverRow>
          <CoverRow label="Company">{f(data.partyACompany, "Company")}</CoverRow>
          <CoverRow label="Address">{f(data.partyAAddress, "Address")}</CoverRow>
          <CoverRow label="Email">{f(data.partyAEmail, "Email")}</CoverRow>
        </div>
        <div>
          <PartyHeading label="Party B" />
          <CoverRow label="Name">{f(data.partyBName, "Party B Name")}</CoverRow>
          <CoverRow label="Company">{f(data.partyBCompany, "Company")}</CoverRow>
          <CoverRow label="Address">{f(data.partyBAddress, "Address")}</CoverRow>
          <CoverRow label="Email">{f(data.partyBEmail, "Email")}</CoverRow>
        </div>
      </div>

      <hr className="border-slate-200 mb-5" />

      <CoverRow label="Purpose">{f(data.purpose, "Purpose")}</CoverRow>
      <CoverRow label="Effective Date">{f(data.effectiveDate, "Effective Date")}</CoverRow>
      <CoverRow label="MNDA Term">
        {yrs(data.mndaTermYears, "X")} from the Effective Date
      </CoverRow>
      <CoverRow label="Term of Confidentiality">
        {yrs(data.confidentialityYears, "X")} from the Effective Date
      </CoverRow>
      <CoverRow label="Governing Law">
        State of {f(data.governingLaw, "State")}
      </CoverRow>
      <CoverRow label="Jurisdiction">{f(data.jurisdiction, "Jurisdiction")}</CoverRow>

      {/* Standard Terms */}
      <SectionHeading className="mt-8">Standard Terms</SectionHeading>

      <Clause n={1} title="Introduction.">
        This Mutual Non-Disclosure Agreement (&ldquo;MNDA&rdquo;) allows each party
        (&ldquo;Disclosing Party&rdquo;) to disclose or make available information in
        connection with the <em>{f(data.purpose, "Purpose")}</em> which (1) the
        Disclosing Party identifies to the receiving party (&ldquo;Receiving Party&rdquo;)
        as &ldquo;confidential&rdquo;, &ldquo;proprietary&rdquo;, or the like or (2) should
        be reasonably understood as confidential or proprietary due to its nature and
        the circumstances of its disclosure (&ldquo;Confidential Information&rdquo;).
      </Clause>

      <Clause n={2} title="Use and Protection of Confidential Information.">
        The Receiving Party shall: (a) use Confidential Information solely for
        the <em>{f(data.purpose, "Purpose")}</em>; (b) not disclose Confidential
        Information to third parties without the Disclosing Party&rsquo;s prior written
        approval; and (c) protect Confidential Information using at least the same
        protections the Receiving Party uses for its own similar information but no
        less than a reasonable standard of care.
      </Clause>

      <Clause n={3} title="Exceptions.">
        The Receiving Party&rsquo;s obligations do not apply to information that:
        (a) is or becomes publicly available through no fault of the Receiving Party;
        (b) it rightfully knew or possessed prior to receipt without confidentiality
        restrictions; (c) it rightfully obtained from a third party without
        confidentiality restrictions; or (d) it independently developed without
        using or referencing the Confidential Information.
      </Clause>

      <Clause n={4} title="Disclosures Required by Law.">
        The Receiving Party may disclose Confidential Information to the extent
        required by law or court order, provided it gives the Disclosing Party
        reasonable advance notice and cooperates with efforts to obtain confidential
        treatment.
      </Clause>

      <Clause n={5} title="Term and Termination.">
        This MNDA commences on <em>{f(data.effectiveDate, "Effective Date")}</em> and
        expires {yrs(data.mndaTermYears, "X")} from the Effective Date. Either party
        may terminate for any reason upon written notice. Confidentiality obligations
        survive for {yrs(data.confidentialityYears, "X")} from the Effective Date,
        despite any expiration or termination.
      </Clause>

      <Clause n={6} title="Return or Destruction.">
        Upon expiration, termination, or the Disclosing Party&rsquo;s request, the
        Receiving Party will cease using and promptly destroy or return all
        Confidential Information in its possession or control.
      </Clause>

      <Clause n={7} title="Proprietary Rights.">
        The Disclosing Party retains all intellectual property rights in its
        Confidential Information. Disclosure grants no license under such rights.
      </Clause>

      <Clause n={8} title="Disclaimer.">
        ALL CONFIDENTIAL INFORMATION IS PROVIDED &ldquo;AS IS&rdquo;, WITH ALL FAULTS,
        AND WITHOUT WARRANTIES, INCLUDING THE IMPLIED WARRANTIES OF TITLE,
        MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
      </Clause>

      <Clause n={9} title="Governing Law and Jurisdiction.">
        This MNDA is governed by the laws of the State
        of <em>{f(data.governingLaw, "State")}</em>, without regard to conflict of
        laws provisions. Any legal action must be instituted in the federal or state
        courts located in <em>{f(data.jurisdiction, "Jurisdiction")}</em>.
      </Clause>

      <Clause n={10} title="General.">
        Neither party is obligated to disclose information or proceed with any
        transaction. Neither party may assign this MNDA without prior written
        consent, except in connection with a merger, acquisition, or transfer of
        substantially all assets. This MNDA constitutes the entire agreement of the
        parties with respect to its subject matter.
      </Clause>

      {/* Signatures */}
      <SectionHeading className="mt-8">Signatures</SectionHeading>
      <div className="grid grid-cols-2 gap-x-10 mt-4">
        <SignatureBlock party="Party A" name={data.partyAName} company={data.partyACompany} />
        <SignatureBlock party="Party B" name={data.partyBName} company={data.partyBCompany} />
      </div>

      <p className="text-center text-[9px] text-slate-300 mt-10 tracking-wide">
        Common Paper Mutual NDA v1.0 · CC BY 4.0 · commonpaper.com
      </p>
    </div>
  );
}

function SectionHeading({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`text-[11px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1.5 mb-4 ${className}`}>
      {children}
    </h2>
  );
}

function PartyHeading({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-2">
      {label}
    </p>
  );
}

function CoverRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2 mb-1.5">
      <span className="font-bold w-36 shrink-0 text-slate-600">{label}:</span>
      <span className="text-slate-800">{children}</span>
    </div>
  );
}

function Clause({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <p className="mb-3 text-justify">
      <span className="font-bold">{n}. {title}</span>{" "}
      {children}
    </p>
  );
}

function SignatureBlock({ party, name, company }: { party: string; name: string; company: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-3">{party}</p>
      <div className="border-b border-slate-300 mb-1 h-8" />
      <p className="text-[10px] text-slate-500">Signature</p>
      <div className="mt-3 border-b border-slate-300 mb-1 h-5" />
      <p className="text-[10px] text-slate-700">{name || <Blank label="Name" />}</p>
      <div className="mt-2 border-b border-slate-300 mb-1 h-5" />
      <p className="text-[10px] text-slate-700">{company || <Blank label="Company" />}</p>
    </div>
  );
}
