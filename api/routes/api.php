<?php

use App\Http\Controllers\api\AuthController;
use App\Http\Controllers\api\DepartmentController;
use App\Http\Controllers\api\UserController;
use App\Http\Controllers\api\AppointmentController;
use App\Http\Controllers\api\DashboardController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/tokens/create', function (Request $request) {
    $token = $request->user()->createToken($request->token_name);

    return ['token' => $token->plainTextToken];
});

Route::post('auth/patient/signup', [AuthController::class, 'signUp']);
Route::post('auth/patient/login', [AuthController::class, 'login']);

Route::post('auth/admin/signup', [AuthController::class, 'signUp']);
Route::post('auth/admin/login', [AuthController::class, 'login']);

Route::post('auth/doctor/signup', [AuthController::class, 'signUp']);
Route::post('auth/doctor/login', [AuthController::class, 'login']);

Route::get('auth/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::apiResource('departments', DepartmentController::class)->middleware('auth:sanctum');
Route::apiResource('appointments', AppointmentController::class)->middleware('auth:sanctum');
Route::get('dashboard/stats', [DashboardController::class, 'index'])->middleware('auth:sanctum')->name('dashboard.stats');
Route::get('dashboard/queue-status', [DashboardController::class, 'queueStatus'])->middleware('auth:sanctum')->name('dashboard.stats');
Route::get('dashboard/recent-activity', [DashboardController::class, 'recentActivities'])->middleware('auth:sanctum')->name('dashboard.stats');


Route::prefix('users')->group(function () {
    Route::get('patients', [UserController::class, 'index']);
    Route::get('doctors', [UserController::class, 'index']);
    Route::get('admins', [UserController::class, 'index']);
});

// Keep this AFTER the above so /{user} doesn’t eat those routes
Route::apiResource('users', UserController::class);
Route::apiResource('/users', UserController::class);
