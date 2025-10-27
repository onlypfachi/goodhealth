<?php

use App\Enums\AppointmentStatusEnum;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('patient_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('appointment_date');
            $table->time('appointment_time')->nullable();
            $table->string('status')->default(AppointmentStatusEnum::Pending->value);
            $table->text('reason');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->datetime('confirmed_at')->nullable();
            $table->datetime('cancelled_at')->nullable();
            $table->datetime('completed_at')->nullable();
            $table->integer('queue_number')->nullable();
            $table->string('room_number')->nullable();
            $table->timestampsTz();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
