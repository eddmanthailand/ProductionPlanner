import MetricsCards from "@/components/dashboard/metrics-cards";
import ProductionSchedule from "@/components/dashboard/production-schedule";
import FinancialSummary from "@/components/dashboard/financial-summary";
import RecentActivities from "@/components/dashboard/recent-activities";

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-inter font-bold text-gray-900 mb-2">Dashboard Overview</h2>
        <p className="text-gray-600">ยินดีต้อนรับ! นี่คือสถานการณ์การดำเนินงานในวันนี้</p>
      </div>

      {/* Metrics Cards */}
      <MetricsCards />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Production Schedule - Takes 2 columns */}
        <div className="lg:col-span-2">
          <ProductionSchedule />
        </div>

        {/* Recent Activities - Takes 1 column */}
        <div>
          <RecentActivities />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Financial Summary */}
        <FinancialSummary />

        {/* Additional space for more widgets */}
        <div>
          {/* This space can be used for additional widgets like charts, alerts, etc. */}
        </div>
      </div>
    </div>
  );
}
