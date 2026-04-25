import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

export interface NdaFormData {
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
  mndaTermYears: number;
  confidentialityYears: number;
  governingLaw: string;
  jurisdiction: string;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: 11,
    paddingTop: 72,
    paddingBottom: 72,
    paddingHorizontal: 72,
    lineHeight: 1.5,
    color: "#1a1a1a",
  },
  title: {
    fontSize: 16,
    fontFamily: "Times-Bold",
    textAlign: "center",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Times-Bold",
    textAlign: "center",
    marginTop: 24,
    marginBottom: 12,
    textDecoration: "underline",
  },
  coverRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  coverLabel: {
    fontFamily: "Times-Bold",
    width: 180,
  },
  coverValue: {
    flex: 1,
  },
  clause: {
    marginBottom: 10,
  },
  clauseNumber: {
    fontFamily: "Times-Bold",
  },
  footer: {
    marginTop: 24,
    fontSize: 9,
    color: "#555",
    textAlign: "center",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginVertical: 16,
  },
});

export function NdaDocument({ data }: { data: NdaFormData }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Mutual Non-Disclosure Agreement</Text>

        {/* Cover Page */}
        <Text style={styles.sectionTitle}>Cover Page</Text>

        <Text style={styles.sectionTitle}>Party A</Text>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Name:</Text>
          <Text style={styles.coverValue}>{data.partyAName}</Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Company:</Text>
          <Text style={styles.coverValue}>{data.partyACompany}</Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Address:</Text>
          <Text style={styles.coverValue}>{data.partyAAddress}</Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Email:</Text>
          <Text style={styles.coverValue}>{data.partyAEmail}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Party B</Text>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Name:</Text>
          <Text style={styles.coverValue}>{data.partyBName}</Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Company:</Text>
          <Text style={styles.coverValue}>{data.partyBCompany}</Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Address:</Text>
          <Text style={styles.coverValue}>{data.partyBAddress}</Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Email:</Text>
          <Text style={styles.coverValue}>{data.partyBEmail}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Purpose:</Text>
          <Text style={styles.coverValue}>{data.purpose}</Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Effective Date:</Text>
          <Text style={styles.coverValue}>{data.effectiveDate}</Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>MNDA Term:</Text>
          <Text style={styles.coverValue}>
            {data.mndaTermYears} {data.mndaTermYears === 1 ? "year" : "years"} from the Effective Date
          </Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Term of Confidentiality:</Text>
          <Text style={styles.coverValue}>
            {data.confidentialityYears} {data.confidentialityYears === 1 ? "year" : "years"} from the Effective Date
          </Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Governing Law:</Text>
          <Text style={styles.coverValue}>State of {data.governingLaw}</Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Jurisdiction:</Text>
          <Text style={styles.coverValue}>{data.jurisdiction}</Text>
        </View>

        {/* Standard Terms */}
        <Text style={styles.sectionTitle}>Standard Terms</Text>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>1. Introduction. </Text>
            This Mutual Non-Disclosure Agreement (&quot;MNDA&quot;) allows each party
            (&quot;Disclosing Party&quot;) to disclose or make available information in
            connection with the {data.purpose} which (1) the Disclosing Party
            identifies to the receiving party (&quot;Receiving Party&quot;) as
            &quot;confidential&quot;, &quot;proprietary&quot;, or the like or (2) should be
            reasonably understood as confidential or proprietary due to its
            nature and the circumstances of its disclosure (&quot;Confidential
            Information&quot;).
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>2. Use and Protection. </Text>
            The Receiving Party shall: (a) use Confidential Information solely
            for the {data.purpose}; (b) not disclose Confidential Information to
            third parties without the Disclosing Party&apos;s prior written approval;
            and (c) protect Confidential Information using at least the same
            protections the Receiving Party uses for its own similar information
            but no less than a reasonable standard of care.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>3. Exceptions. </Text>
            The Receiving Party&apos;s obligations do not apply to information that:
            (a) is or becomes publicly available through no fault of the
            Receiving Party; (b) it rightfully knew or possessed prior to
            receipt without confidentiality restrictions; (c) it rightfully
            obtained from a third party without confidentiality restrictions; or
            (d) it independently developed without using or referencing the
            Confidential Information.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>4. Disclosures Required by Law. </Text>
            The Receiving Party may disclose Confidential Information to the
            extent required by law or court order, provided it gives the
            Disclosing Party reasonable advance notice and cooperates with
            efforts to obtain confidential treatment.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>5. Term and Termination. </Text>
            This MNDA commences on {data.effectiveDate} and expires{" "}
            {data.mndaTermYears} {data.mndaTermYears === 1 ? "year" : "years"}{" "}
            from the Effective Date. Either party may terminate for any reason
            upon written notice. Confidentiality obligations survive for{" "}
            {data.confidentialityYears}{" "}
            {data.confidentialityYears === 1 ? "year" : "years"} from the
            Effective Date, despite any expiration or termination.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>6. Return or Destruction. </Text>
            Upon expiration, termination, or the Disclosing Party&apos;s request,
            the Receiving Party will cease using and promptly destroy or return
            all Confidential Information in its possession or control.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>7. Proprietary Rights. </Text>
            The Disclosing Party retains all intellectual property rights in its
            Confidential Information. Disclosure grants no license under such
            rights.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>8. Disclaimer. </Text>
            ALL CONFIDENTIAL INFORMATION IS PROVIDED &quot;AS IS&quot;, WITH ALL FAULTS,
            AND WITHOUT WARRANTIES, INCLUDING THE IMPLIED WARRANTIES OF TITLE,
            MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>9. Governing Law and Jurisdiction. </Text>
            This MNDA is governed by the laws of the State of {data.governingLaw}
            , without regard to conflict of laws provisions. Any legal action
            must be instituted in the federal or state courts located in{" "}
            {data.jurisdiction}.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>10. General. </Text>
            Neither party is obligated to disclose information or proceed with
            any transaction. Neither party may assign this MNDA without prior
            written consent, except in connection with a merger, acquisition, or
            transfer of substantially all assets. This MNDA constitutes the
            entire agreement of the parties with respect to its subject matter.
          </Text>
        </View>

        <Text style={styles.footer}>
          Common Paper Mutual Non-Disclosure Agreement v1.0 — Licensed under CC
          BY 4.0 (https://creativecommons.org/licenses/by/4.0/)
        </Text>
      </Page>
    </Document>
  );
}

export function generateNdaPdf(data: NdaFormData): Promise<Buffer> {
  return renderToBuffer(<NdaDocument data={data} />);
}
