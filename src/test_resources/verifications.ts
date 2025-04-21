/*
 * Verification of the expected client
 */
import { Client } from "./expected_client";

const client_without_default_headers = new Client({});
client_without_default_headers.getUsers({
  query: {
    page: 1,
    pageSize: 10,
    membershipType: "REGULAR",
  },
});
// It must specify the header parameter entirely
client_without_default_headers.getUsersBulkJobid({
  header: {
    Authorization: "Bearer token",
    "Application-Version": "1.0",
    "Something-Id": "123",
  },
  path: { jobId: "123" },
});

const client_with_partial_default_headers = new Client(
  {},
  { Authorization: "Bearer token", "Application-Version": "1.0" },
);
client_with_partial_default_headers.getUsers({
  query: {
    page: 1,
    pageSize: 10,
    membershipType: "REGULAR",
  },
});
// It can specify the header parameter partially
client_with_partial_default_headers.getUsersBulkJobid({
  header: {
    "Something-Id": "123",
  },
  path: { jobId: "123" },
});
// It also can specify the header parameter entirely
client_with_partial_default_headers.getUsersBulkJobid({
  header: {
    Authorization: "Bearer token",
    "Application-Version": "1.0",
    "Something-Id": "123",
  },
  path: { jobId: "123" },
});

const client_with_all_default_headers = new Client(
  {},
  {
    Authorization: "Bearer token",
    "Application-Version": "1.0",
    "Something-Id": "123",
  },
);
client_with_all_default_headers.getUsers({
  query: {
    page: 1,
    pageSize: 10,
    membershipType: "REGULAR",
  },
});
// It also can omit the header parameter
client_with_all_default_headers.getUsersBulkJobid({
  path: { jobId: "123" },
});
// It also can specify the header parameter entirely
client_with_all_default_headers.getUsersBulkJobid({
  header: {
    Authorization: "Bearer token",
    "Application-Version": "1.0",
    "Something-Id": "123",
  },
  path: { jobId: "123" },
});
