const inquiryDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Colombo",
});

export function formatInquiryDate(value) {
  return inquiryDateFormatter.format(new Date(value));
}
