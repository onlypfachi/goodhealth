import { PlaceholderPattern } from "@/components/ui/placeholder-pattern";
import AppLayout from "@/layouts/app-layout";
import { dashboard } from "@/routes";
import { SharedData, type BreadcrumbItem } from "@/types";
import { Head } from "@inertiajs/react";
import { usePage } from "@inertiajs/react";
import { Button } from "@headlessui/react";
import { Loader } from "lucide-react";
// import clsx from "clsx";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Dashboard",
        href: dashboard().url,
    },
];

// const Card = ({ title, value, icon: Icon, className = "" }) => (
//     <div
//         className={clsx(
//             "p-5 rounded-xl border bg-white dark:bg-gray-800 shadow-md",
//             className,
//         )}
//     >
//         <div className="flex items-center justify-between">
//             <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
//                 {title}
//             </p>
//             <Icon className="size-5 text-indigo-500 dark:text-indigo-400" />
//         </div>
//         <div className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
//             {value}
//         </div>
//     </div>
// );
export default function Dashboard() {
    // Destructure `auth` from `usePage().props`
    const { auth } = usePage<SharedData>().props;
    const type: string = auth.user.type || "PATIENT";

    const hasAppointment: boolean = false;

    // Safely get the user's name, defaulting to "User" if not available
    const userName = auth.user?.name || "User";

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                {/* --- Welcome Text Goes Here --- */}
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    Welcome back, {userName}!
                </h1>
                <p className="text-lg text-gray-500 dark:text-gray-400">
                    Your quick overview is below.
                </p>
                {/* ----------------------------- */}

                {auth.user.type !== "PATIENT" && (
                    <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                        <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                            <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        </div>
                        <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                            <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        </div>
                        <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                            <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        </div>
                    </div>
                )}

                <div className="relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                    {/* --- When patient HAS an appointment --- */}
                    {type === "PATIENT" && hasAppointment && (
                        <div className="flex flex-col items-center justify-center space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 text-center">
                            <div className="bg-indigo-600 text-white rounded-full p-6 inline-flex items-center justify-center shadow-lg">
                                <Loader className="size-10 animate-spin" />
                            </div>

                            <h1 className="text-5xl font-extrabold text-gray-900 dark:text-gray-100">
                                Now Serving
                            </h1>
                            <p className="text-7xl font-mono tracking-widest text-indigo-600 dark:text-indigo-400 animate-pulse">
                                103
                            </p>

                            <div className="border-t border-gray-200 dark:border-gray-700 w-full pt-6 space-y-3">
                                <div className="flex justify-between w-full text-xl font-semibold text-gray-800 dark:text-gray-200">
                                    <span>Estimated Wait:</span>
                                    <span className="text-green-600 dark:text-green-400">
                                        15 minutes
                                    </span>
                                </div>
                                <div className="flex justify-between w-full text-lg text-gray-500 dark:text-gray-400">
                                    <span>People Ahead:</span>
                                    <span className="font-bold">5</span>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg w-full">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Next: Token 104 at Room 5 (Dr. Jones)
                                </p>
                            </div>
                        </div>
                    )}

                    {/* --- When patient has NO appointment --- */}
                    {type === "PATIENT" && !hasAppointment && (
                        <div className="flex flex-col items-center justify-center space-y-6 p-8 rounded-2xl shadow-xl border  text-center h-full">
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-6 inline-flex items-center justify-center shadow-lg">
                                <Loader className="size-10 text-gray-400 dark:text-gray-500" />
                            </div>

                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                No Appointments Yet
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md">
                                You don’t have any active or upcoming appointments. Schedule one
                                to get started.
                            </p>

                            <Button
                                className="inline-flex items-center gap-2 rounded-md bg-gray-700 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-white data-hover:bg-gray-600 data-open:bg-gray-700"
                                onClick={() => {
                                    // Example Inertia navigation
                                    // window.location.href = route("appointments.create");
                                }}
                            >
                                Create Appointment
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
