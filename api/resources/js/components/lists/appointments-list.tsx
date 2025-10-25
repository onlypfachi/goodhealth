import { Link, usePage } from "@inertiajs/react";
import { CalendarDays, Clock, User2, FilePlus2 } from "lucide-react";
import clsx from "clsx";
import { SharedData } from "@/types";
import { store } from "@/routes/appointments";

interface Props {
    appointments: Appointment[];
}

export default function AppointmentsList({ appointments }: Props) {
    const { auth } = usePage<SharedData>().props;
    const type = auth.user.type || "patient";

    return (
        <div className="flex flex-col gap-6 p-6  ">
            <div className="flex items-center justify-between">
                {type === "patient" && (
                    <Link
                        onClick={() => store().url}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
                    >
                        <FilePlus2 className="w-4 h-4" />
                        Create Appointment
                    </Link>
                )}
            </div>

            {appointments.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No appointments found.
                </div>
            ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {appointments.map((appointment) => (
                        <li
                            key={appointment.id}
                            className="flex items-center justify-between py-4 px-2"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
                                <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                                    <User2 className="w-4 h-4 text-indigo-500" />
                                    <span>{appointment.doctor_name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                    <CalendarDays className="w-4 h-4" />
                                    <span>{appointment.appointment_date}</span>
                                    <Clock className="w-4 h-4 ml-3" />
                                    <span>{appointment.appointment_time}</span>
                                </div>
                            </div>

                            <span
                                className={clsx("px-3 py-1 text-xs font-medium rounded-full", {
                                    "bg-green-100 text-green-700":
                                        appointment.status === "CONFIRMED",
                                    "bg-yellow-100 text-yellow-700":
                                        appointment.status === "PENDING",
                                    "bg-red-100 text-red-700": appointment.status === "CANCELLED",
                                    "bg-gray-100 text-gray-600":
                                        appointment.status === "COMPLETED",
                                })}
                            >
                                {appointment.status}
                            </span>

                            {/* View / Edit link using Wayfinder route */}
                            <Link
                                href={route("appointments.show", appointment.id)}
                                className="ml-4 text-indigo-600 hover:underline text-sm"
                            >
                                View
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
