type TrendPoint = {
    label: string;
    count: number;
};

type AdminTrendChartProps = {
    title: string;
    value: number;
    subtitle: string;
    data: TrendPoint[];
    tone?: "purple" | "green";
};

function AdminTrendChart({
    title,
    value,
    subtitle,
    data,
    tone = "purple",
}: AdminTrendChartProps) {
    const maxValue = Math.max(...data.map((point) => point.count), 1);

    return (
        <article className="admin-jobs-overview-card admin-jobs-chart-card">
            <div className="admin-jobs-section-header">
                <div>
                    <h2>{title}</h2>
                    <p>{subtitle}</p>
                </div>
                <span className="admin-jobs-count-chip">{value}</span>
            </div>

            <div className={`admin-jobs-chart admin-jobs-chart-${tone}`}>
                {data.map((point) => (
                    <div key={point.label} className="admin-jobs-chart-column">
                        <div
                            className="admin-jobs-chart-bar"
                            style={{
                                height: `${Math.max((point.count / maxValue) * 100, point.count > 0 ? 12 : 4)}%`,
                            }}
                        />
                        <strong>{point.count}</strong>
                        <span>{point.label}</span>
                    </div>
                ))}
            </div>
        </article>
    );
}

export default AdminTrendChart;
