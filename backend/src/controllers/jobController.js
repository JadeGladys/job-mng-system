const { randomUUID } = require("crypto");
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

const createJob = (req, res) => {
    const {
        title,
        description,
        location,
        company,
        category,
        job_type,
        work_mode,
        requirements,
        deadline,
    } = req.body;

    if (
        !title ||
        !description ||
        !location ||
        !company ||
        !category ||
        !job_type ||
        !work_mode ||
        !requirements ||
        !deadline
    ) {
        return res.status(400).json({
            message: "All job fields are required.",
        });
    }

    const jobUid = randomUUID();

    db.run(
        `
    INSERT INTO jobs (
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
      created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
        [
            jobUid,
            title.trim(),
            description.trim(),
            location.trim(),
            company.trim(),
            category.trim(),
            job_type.trim(),
            work_mode.trim(),
            requirements.trim(),
            deadline,
            req.user.id,
        ],
        function (error) {
            if (error) {
                return res.status(500).json({
                    message: "Failed to create job.",
                    error: error.message,
                });
            }

            return res.status(201).json({
                message: "Job created successfully.",
                job: {
                    uid: jobUid,
                    title,
                    description,
                    location,
                    company,
                    category,
                    job_type,
                    work_mode,
                    requirements,
                    deadline,
                },
            });
        }
    );
};

const updateJob = (req, res) => {
    const { uid } = req.params;

    const allowedFields = [
        "title",
        "description",
        "location",
        "company",
        "category",
        "job_type",
        "work_mode",
        "requirements",
        "deadline",
    ];

    const updates = [];
    const values = [];

    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
            updates.push(`${field} = ?`);
            values.push(
                typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field]
            );
        }
    });

    if (updates.length === 0) {
        return res.status(400).json({
            message: "At least one valid field is required for update.",
        });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(uid);

    const query = `
    UPDATE jobs
    SET ${updates.join(", ")}
    WHERE uid = ?
  `;

    db.run(query, values, function (error) {
        if (error) {
            return res.status(500).json({
                message: "Failed to update job.",
                error: error.message,
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                message: "Job not found.",
            });
        }

        return res.status(200).json({
            message: "Job updated successfully.",
        });
    });
};


const deleteJob = (req, res) => {
    const { uid } = req.params;

    db.run(
        "DELETE FROM jobs WHERE uid = ?",
        [uid],
        function (error) {
            if (error) {
                return res.status(500).json({
                    message: "Failed to delete job.",
                    error: error.message,
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    message: "Job not found.",
                });
            }

            return res.status(200).json({
                message: "Job deleted successfully.",
            });
        }
    );
};

module.exports = {
    getAllJobs,
    createJob,
    updateJob,
    deleteJob,
};
