import html
from dataclasses import dataclass
from io import BytesIO

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Table,
    TableStyle,
)

MARGIN = 72  # 1 inch in points
_PAGE_WIDTH = LETTER[0]
_CONTENT_WIDTH = _PAGE_WIDTH - 2 * MARGIN  # 468pt
_LABEL_WIDTH = 180
_VALUE_WIDTH = _CONTENT_WIDTH - _LABEL_WIDTH  # 288pt

_DARK = HexColor("#1a1a1a")
_RULE_COLOR = HexColor("#cccccc")
_FOOTER_COLOR = HexColor("#555555")

_TITLE_STYLE = ParagraphStyle(
    "title",
    fontName="Times-Bold",
    fontSize=16,
    leading=24,
    textColor=_DARK,
    alignment=TA_CENTER,
    spaceAfter=24,
)
_SECTION_STYLE = ParagraphStyle(
    "section",
    fontName="Times-Bold",
    fontSize=12,
    leading=18,
    textColor=_DARK,
    alignment=TA_CENTER,
    spaceBefore=16,
    spaceAfter=12,
)
_CELL_STYLE = ParagraphStyle(
    "cell",
    fontName="Times-Roman",
    fontSize=11,
    leading=16.5,
    textColor=_DARK,
)
_CLAUSE_STYLE = ParagraphStyle(
    "clause",
    fontName="Times-Roman",
    fontSize=11,
    leading=16.5,
    textColor=_DARK,
    spaceAfter=10,
)
_FOOTER_STYLE = ParagraphStyle(
    "footer",
    fontName="Times-Roman",
    fontSize=9,
    leading=13.5,
    textColor=_FOOTER_COLOR,
    alignment=TA_CENTER,
    spaceBefore=24,
)


@dataclass
class NdaData:
    partyAName: str
    partyACompany: str
    partyAAddress: str
    partyAEmail: str
    partyBName: str
    partyBCompany: str
    partyBAddress: str
    partyBEmail: str
    purpose: str
    effectiveDate: str
    mndaTermYears: int
    confidentialityYears: int
    governingLaw: str
    jurisdiction: str


def _e(s: str) -> str:
    return html.escape(str(s))


def _cover_table(rows: list[tuple[str, str]]) -> Table:
    data = [
        [
            Paragraph(f"<b>{_e(label)}</b>", _CELL_STYLE),
            Paragraph(_e(value), _CELL_STYLE),
        ]
        for label, value in rows
    ]
    t = Table(data, colWidths=[_LABEL_WIDTH, _VALUE_WIDTH])
    t.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    return t


def _hr() -> HRFlowable:
    return HRFlowable(
        width="100%", thickness=1, color=_RULE_COLOR, spaceBefore=16, spaceAfter=16
    )


def _years(n: int) -> str:
    return f"{n} year{'s' if n != 1 else ''}"


def generate_nda_pdf(data: NdaData) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=LETTER,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
    )

    p = _e(data.purpose)
    eff = _e(data.effectiveDate)
    glaw = _e(data.governingLaw)
    jur = _e(data.jurisdiction)
    my = data.mndaTermYears
    cy = data.confidentialityYears

    clauses = [
        (
            "1. Introduction.",
            f'This Mutual Non-Disclosure Agreement ("MNDA") allows each party ("Disclosing Party") to disclose or make available information in connection with the {p} which (1) the Disclosing Party identifies to the receiving party ("Receiving Party") as "confidential", "proprietary", or the like or (2) should be reasonably understood as confidential or proprietary due to its nature and the circumstances of its disclosure ("Confidential Information").',
        ),
        (
            "2. Use and Protection.",
            f"The Receiving Party shall: (a) use Confidential Information solely for the {p}; (b) not disclose Confidential Information to third parties without the Disclosing Party's prior written approval; and (c) protect Confidential Information using at least the same protections the Receiving Party uses for its own similar information but no less than a reasonable standard of care.",
        ),
        (
            "3. Exceptions.",
            "The Receiving Party's obligations do not apply to information that: (a) is or becomes publicly available through no fault of the Receiving Party; (b) it rightfully knew or possessed prior to receipt without confidentiality restrictions; (c) it rightfully obtained from a third party without confidentiality restrictions; or (d) it independently developed without using or referencing the Confidential Information.",
        ),
        (
            "4. Disclosures Required by Law.",
            "The Receiving Party may disclose Confidential Information to the extent required by law or court order, provided it gives the Disclosing Party reasonable advance notice and cooperates with efforts to obtain confidential treatment.",
        ),
        (
            "5. Term and Termination.",
            f"This MNDA commences on {eff} and expires {_years(my)} from the Effective Date. Either party may terminate for any reason upon written notice. Confidentiality obligations survive for {_years(cy)} from the Effective Date, despite any expiration or termination.",
        ),
        (
            "6. Return or Destruction.",
            "Upon expiration, termination, or the Disclosing Party's request, the Receiving Party will cease using and promptly destroy or return all Confidential Information in its possession or control.",
        ),
        (
            "7. Proprietary Rights.",
            "The Disclosing Party retains all intellectual property rights in its Confidential Information. Disclosure grants no license under such rights.",
        ),
        (
            "8. Disclaimer.",
            'ALL CONFIDENTIAL INFORMATION IS PROVIDED "AS IS", WITH ALL FAULTS, AND WITHOUT WARRANTIES, INCLUDING THE IMPLIED WARRANTIES OF TITLE, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.',
        ),
        (
            "9. Governing Law and Jurisdiction.",
            f"This MNDA is governed by the laws of the State of {glaw}, without regard to conflict of laws provisions. Any legal action must be instituted in the federal or state courts located in {jur}.",
        ),
        (
            "10. General.",
            "Neither party is obligated to disclose information or proceed with any transaction. Neither party may assign this MNDA without prior written consent, except in connection with a merger, acquisition, or transfer of substantially all assets. This MNDA constitutes the entire agreement of the parties with respect to its subject matter.",
        ),
    ]

    story = [
        Paragraph("Mutual Non-Disclosure Agreement", _TITLE_STYLE),
        Paragraph("<u>Cover Page</u>", _SECTION_STYLE),
        Paragraph("<u>Party A</u>", _SECTION_STYLE),
        _cover_table([
            ("Name:", data.partyAName),
            ("Company:", data.partyACompany),
            ("Address:", data.partyAAddress),
            ("Email:", data.partyAEmail),
        ]),
        _hr(),
        Paragraph("<u>Party B</u>", _SECTION_STYLE),
        _cover_table([
            ("Name:", data.partyBName),
            ("Company:", data.partyBCompany),
            ("Address:", data.partyBAddress),
            ("Email:", data.partyBEmail),
        ]),
        _hr(),
        _cover_table([
            ("Purpose:", data.purpose),
            ("Effective Date:", data.effectiveDate),
            ("MNDA Term:", f"{_years(my)} from the Effective Date"),
            ("Term of Confidentiality:", f"{_years(cy)} from the Effective Date"),
            ("Governing Law:", f"State of {data.governingLaw}"),
            ("Jurisdiction:", data.jurisdiction),
        ]),
        Paragraph("<u>Standard Terms</u>", _SECTION_STYLE),
        *[
            Paragraph(f"<b>{_e(num)}</b> {body}", _CLAUSE_STYLE)
            for num, body in clauses
        ],
        Paragraph(
            "Common Paper Mutual Non-Disclosure Agreement v1.0 — Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)",
            _FOOTER_STYLE,
        ),
    ]

    doc.build(story)
    return buf.getvalue()
