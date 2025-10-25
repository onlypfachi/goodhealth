<?php

namespace App\Http\Controllers\api;

use App\Enums\UserTypeEnum;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class AuthController extends Controller
{
    public function login(Request $request) {
        $userType = $this->getUserTypeFromRequest($request);
        if (! $userType instanceof UserTypeEnum) {
            // The helper returns a JSON response if invalid
            return $userType;
        }

        $request->validate([
            'email' => 'required|string|lowercase|email|max:255|exists:users,email',
            'password' => ['required'],
        ]);

        $user = User::where('email', $request->email)->first();
        if (!$user || $user->type !== $userType->value || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'User logged in successfully',
            'user' => $user,
            'token' => $user->createToken('auth_token')->plainTextToken,
        ], 200);
    }

    public function signUp(Request $request)
    {
        $userType = $this->getUserTypeFromRequest($request);
        if (! $userType instanceof UserTypeEnum) {
            // The helper returns a JSON response if invalid
            return $userType;
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:' . User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'type' => $userType,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User registered successfully',
            'user' => $user,
            'token' => $user->createToken('auth_token')->plainTextToken,
        ], 201);
    }

    public function logout(Request $request){
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'User logged out successfully',
        ], 200);
    }

    /**
     * Extracts and validates the user type from the request URL.
     *
     * Example URL: /api/auth/patient/signup
     * Returns a UserTypeEnum if valid, or a JSON response if invalid.
     */
    private function getUserTypeFromRequest(Request $request)
    {
        $segments = $request->segments(); // e.g. ['api','auth','patient','signup']
        $authIndex = array_search('auth', $segments, true);
        $role = $authIndex !== false && isset($segments[$authIndex + 1])
            ? strtolower($segments[$authIndex + 1])
            : null;

        $map = [
            'patient' => UserTypeEnum::PATIENT,
            'admin' => UserTypeEnum::ADMIN,
            'doctor' => UserTypeEnum::DOCTOR,
        ];

        if (! isset($map[$role])) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid role in URL. Expected one of: patient, admin, doctor.',
                'found' => $role,
            ], 400);
        }

        return $map[$role];
    }
}
