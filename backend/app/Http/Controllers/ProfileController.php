<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Throwable;

/**
 * Lets a signed-in user change their own name, login email and password.
 *
 * Both actions re-check the current password. A valid session is not enough:
 * if someone walks up to an unlocked laptop, they still should not be able to
 * lock the real owner out by swapping the email and password.
 */
class ProfileController extends Controller
{
    /**
     * Update the display name and the email used to sign in.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'username' => [
                // alpha_dash keeps "@" out, so a username can never be mistaken
                // for an email when signing in.
                'required', 'string', 'min:3', 'max:50', 'alpha_dash',
                Rule::unique('users')->ignore($user->id),
            ],
            'email' => [
                'required', 'string', 'email', 'max:255',
                Rule::unique('users')->ignore($user->id),
            ],
            'current_password' => 'required|string',
        ], [
            'username.unique' => 'That username is already taken.',
            'username.alpha_dash' => 'Use letters, numbers, dashes and underscores only.',
            'email.unique' => 'That email is already used by another account.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        if (! Hash::check($request->input('current_password'), $user->password)) {
            return response()->json([
                'success' => false,
                'errors' => ['current_password' => ['That password is incorrect.']],
            ], 422);
        }

        try {
            $user->update([
                'name' => $request->input('name'),
                'username' => strtolower($request->input('username')),
                'email' => $request->input('email'),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Profile updated',
                'user' => $user->fresh(),
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Change the password.
     *
     * Every other session is signed out afterwards, so if the reason for the
     * change is "someone else knows my password", changing it actually locks
     * them out instead of leaving their session alive.
     */
    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ], [
            'password.confirmed' => 'The two new passwords do not match.',
            'password.min' => 'Use at least 8 characters.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        if (! Hash::check($request->input('current_password'), $user->password)) {
            return response()->json([
                'success' => false,
                'errors' => ['current_password' => ['That password is incorrect.']],
            ], 422);
        }

        if (Hash::check($request->input('password'), $user->password)) {
            return response()->json([
                'success' => false,
                'errors' => ['password' => ['Choose a password different from the current one.']],
            ], 422);
        }

        try {
            $user->update(['password' => Hash::make($request->input('password'))]);

            // Keep this session, drop the rest.
            $currentId = $request->user()->currentAccessToken()->id;
            $user->tokens()->where('id', '!=', $currentId)->delete();

            return response()->json([
                'success' => true,
                'message' => 'Password changed. Other devices have been signed out.',
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to change password',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
