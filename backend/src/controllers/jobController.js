const db = require("../config/database");

const getAllJobs = (req, res) => {
    const { title, location, category, job_type, work_mode } = req.query;

    let query = `
    SELECT
      uid,
      title,
      description,
      location,
      company,
      category,
      job_type,
      work_mode,
      requirements,
      deadline,
      created_at,
      updated_at
    FROM jobs
  `;

    const conditions = [];
    const params = [];

    if (title) {
        conditions.push("title LIKE ?");
        params.push(`%${title}%`);
    }

    if (location) {
        conditions.push("location LIKE ?");
        params.push(`%${location}%`);
    }

    if (category) {
        conditions.push("category LIKE ?");
        params.push(`%${category}%`);
    }

    if (job_type) {
        conditions.push("job_type LIKE ?");
        params.push(`%${job_type}%`);
    }

    if (work_mode) {
        conditions.push("work_mode LIKE ?");
        params.push(`%${work_mode}%`);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += " ORDER BY created_at DESC";

    db.all(query, params, (error, jobs) => {
        if (error) {
            return res.status(500).json({
                message: "Failed to fetch jobs.",
                error: error.message,
            });
        }

        return res.status(200).json({
            message: "Jobs fetched successfully.",
            jobs,
        });
    });
};

module.exports = {
    getAllJobs,
};
