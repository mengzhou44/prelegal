import { render, screen, within } from "@testing-library/react";
import { NdaPreview, PreviewData } from "@/components/nda-preview";

const fullData: PreviewData = {
  partyAName: "Alice Johnson",
  partyACompany: "Acme Corp",
  partyAAddress: "123 Main St, San Francisco, CA 94105",
  partyAEmail: "alice@acme.com",
  partyBName: "Bob Smith",
  partyBCompany: "Widget Inc",
  partyBAddress: "456 Market St, New York, NY 10001",
  partyBEmail: "bob@widget.com",
  purpose: "Evaluating a potential business partnership",
  effectiveDate: "January 1, 2025",
  mndaTermYears: "2",
  confidentialityYears: "3",
  governingLaw: "California",
  jurisdiction: "San Francisco, California",
};

const emptyData: PreviewData = {
  partyAName: "",
  partyACompany: "",
  partyAAddress: "",
  partyAEmail: "",
  partyBName: "",
  partyBCompany: "",
  partyBAddress: "",
  partyBEmail: "",
  purpose: "",
  effectiveDate: "",
  mndaTermYears: "",
  confidentialityYears: "",
  governingLaw: "",
  jurisdiction: "",
};

describe("NdaPreview", () => {
  describe("with full data", () => {
    beforeEach(() => render(<NdaPreview data={fullData} />));

    it("renders document title heading", () => {
      expect(
        screen.getByRole("heading", { level: 1, name: /Mutual Non-Disclosure Agreement/i })
      ).toBeInTheDocument();
    });

    it("renders Party A name at least once", () => {
      expect(screen.getAllByText("Alice Johnson").length).toBeGreaterThanOrEqual(1);
    });

    it("renders Party A company", () => {
      expect(screen.getAllByText("Acme Corp").length).toBeGreaterThanOrEqual(1);
    });

    it("renders Party A email", () => {
      expect(screen.getByText("alice@acme.com")).toBeInTheDocument();
    });

    it("renders Party B name at least once", () => {
      expect(screen.getAllByText("Bob Smith").length).toBeGreaterThanOrEqual(1);
    });

    it("renders Party B company", () => {
      expect(screen.getAllByText("Widget Inc").length).toBeGreaterThanOrEqual(1);
    });

    it("renders Party B email", () => {
      expect(screen.getByText("bob@widget.com")).toBeInTheDocument();
    });

    it("renders MNDA term as '2 years'", () => {
      expect(screen.getAllByText(/2 years/i).length).toBeGreaterThan(0);
    });

    it("renders confidentiality term as '3 years'", () => {
      expect(screen.getAllByText(/3 years/i).length).toBeGreaterThan(0);
    });

    it("renders '1 year' (not '1 years') for singular", () => {
      const { unmount } = render(
        <NdaPreview data={{ ...fullData, mndaTermYears: "1" }} />
      );
      const yearMatches = screen.getAllByText(/1 year/i);
      const pluralMatches = screen.queryAllByText(/1 years/i);
      expect(yearMatches.length).toBeGreaterThan(0);
      expect(pluralMatches.length).toBe(0);
      unmount();
    });

    it("renders governing law", () => {
      expect(screen.getAllByText(/State of California/i).length).toBeGreaterThan(0);
    });

    it("renders jurisdiction", () => {
      expect(
        screen.getAllByText(/San Francisco, California/i).length
      ).toBeGreaterThan(0);
    });

    it("renders purpose in document", () => {
      expect(
        screen.getAllByText(/Evaluating a potential business partnership/i).length
      ).toBeGreaterThan(0);
    });

    it("renders effective date", () => {
      expect(screen.getAllByText(/January 1, 2025/i).length).toBeGreaterThan(0);
    });

    it("renders all 10 numbered clause headings", () => {
      const clauseTitles = [
        "Introduction",
        "Use and Protection",
        "Exceptions",
        "Disclosures Required by Law",
        "Term and Termination",
        "Return or Destruction",
        "Proprietary Rights",
        "Disclaimer",
        "Governing Law and Jurisdiction",
        "General",
      ];
      clauseTitles.forEach((title) => {
        expect(screen.getByText(new RegExp(title, "i"))).toBeInTheDocument();
      });
    });

    it("renders signature blocks section heading", () => {
      expect(
        screen.getByRole("heading", { level: 2, name: /Signatures/i })
      ).toBeInTheDocument();
    });
  });

  describe("with empty data (blank placeholders)", () => {
    beforeEach(() => render(<NdaPreview data={emptyData} />));

    it("shows placeholder for Party A Name", () => {
      expect(screen.getAllByText("Party A Name").length).toBeGreaterThan(0);
    });

    it("shows placeholder for Effective Date", () => {
      expect(screen.getAllByText("Effective Date").length).toBeGreaterThan(0);
    });

    it("shows placeholder X for empty year fields", () => {
      expect(screen.getAllByText("X").length).toBeGreaterThan(0);
    });

    it("shows placeholder for State", () => {
      expect(screen.getAllByText("State").length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("treats year value of 0 as invalid (shows placeholder X)", () => {
      render(<NdaPreview data={{ ...fullData, mndaTermYears: "0" }} />);
      expect(screen.getAllByText("X").length).toBeGreaterThan(0);
    });

    it("treats negative year as invalid (shows placeholder X)", () => {
      render(<NdaPreview data={{ ...fullData, mndaTermYears: "-1" }} />);
      expect(screen.getAllByText("X").length).toBeGreaterThan(0);
    });

    it("treats non-numeric year as invalid (shows placeholder X)", () => {
      render(<NdaPreview data={{ ...fullData, mndaTermYears: "abc" }} />);
      expect(screen.getAllByText("X").length).toBeGreaterThan(0);
    });

    it("renders whitespace-only purpose as blank placeholder", () => {
      render(<NdaPreview data={{ ...fullData, purpose: "   " }} />);
      expect(screen.getAllByText("Purpose").length).toBeGreaterThan(0);
    });

    it("handles special characters in names without crashing", () => {
      expect(() =>
        render(
          <NdaPreview
            data={{ ...fullData, partyAName: "O'Brien & Sons <Test>" }}
          />
        )
      ).not.toThrow();
    });
  });
});
