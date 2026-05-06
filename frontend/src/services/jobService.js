const API_BASE_URL = "http://localhost:5050/api/jobs";

export const fetchJobs = async (filters = {}) => {
  const query = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      query.append(key, value);
    }
  });

  const queryString = query.toString();
  const response = await fetch(queryString ? `${API_BASE_URL}?${queryString}` : API_BASE_URL);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch jobs.");
  }

  return data;
};
