import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import NewInquiryForm from "../components/NewInquiryForm.jsx";
import { apiRequest } from "../lib/api.js";

vi.mock("../lib/api.js", () => ({ apiRequest: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("NewInquiryForm", () => {
  it("shows a server validation error and leaves the form available to correct", async () => {
    apiRequest.mockRejectedValue(new Error("contact is required."));
    render(<NewInquiryForm onCreated={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Customer name"), { target: { value: "Jordan Lee" } });
    fireEvent.change(screen.getByLabelText("Contact details"), { target: { value: "jordan@example.com" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Delivery question" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "The parcel has not arrived." } });
    fireEvent.submit(screen.getByRole("form"));

    expect(await screen.findByRole("alert")).toHaveTextContent("contact is required.");
    expect(screen.getByLabelText("Contact details")).toHaveValue("jordan@example.com");
    expect(screen.getByRole("button", { name: "Save inquiry" })).toBeEnabled();
  });
});
