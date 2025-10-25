import { type BreadcrumbItem, SharedData } from "@/types";
import { Head, usePage } from "@inertiajs/react";

import AppLayout from "@/layouts/app-layout";
import { appointments } from "@/actions/App/Http/Controllers/AppointmentController";
import AppointmentsList from "@/components/lists/appointments-list";
import AppointmentForm from "@/forms/appointment-form";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Appointments",
        href: appointments().url,
    },
];

export default function Appearance() {
    const { appointments } = usePage<SharedData>().props;
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appointments" />
            {/* <AppointmentsList appointments={appointments} /> */}
            <AppointmentForm patients={[]} doctors={[]} clinics={[]} currentUserId={0} onSubmit={function (data: any): void {
                throw new Error("Function not implemented.");
            }} />
        </AppLayout>
    );
}
