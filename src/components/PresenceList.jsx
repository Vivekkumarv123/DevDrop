'use client';

import { useEffect, useState, useCallback } from "react";
import { database } from "../lib/firebase";
import { ref, onValue, onDisconnect, set, remove } from "firebase/database";
import { initAuth } from "../lib/auth";
import { 
  Users, 
  User, 
  Wifi, 
  WifiOff, 
  Eye,
  UserCheck,
  Globe,
  Loader2
} from 'lucide-react';

export default function PresenceList({ noteId }) {
  const [user, setUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  const generateUserColor = useCallback((uid) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-amber-500'
    ];
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  const getUserInitials = useCallback((uid) => {
    if (!uid) return '?';
    return uid.slice(0, 2).toUpperCase();
  }, []);

  const formatUserId = useCallback((uid) => {
    if (!uid) return 'Unknown User';
    return uid.length > 12 ? `${uid.slice(0, 8)}...${uid.slice(-4)}` : uid;
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await initAuth(setUser);
        setIsInitializing(false);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setConnectionError(true);
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    if (!user || !noteId) return;

    const connectedRef = ref(database, ".info/connected");
    const presenceRef = ref(database, `presence/${noteId}/${user.uid}`);

    const unsubscribeConnected = onValue(
      connectedRef, 
      (snap) => {
        const connected = snap.val() === true;
        setIsConnected(connected);
        setConnectionError(false);
        
        if (connected) {
          set(presenceRef, { 
            uid: user.uid,
            timestamp: Date.now(),
            status: 'active'
          });
          onDisconnect(presenceRef).remove();
        }
      },
      (error) => {
        console.error('Connection error:', error);
        setConnectionError(true);
        setIsConnected(false);
      }
    );

    const usersRef = ref(database, `presence/${noteId}`);
    const unsubscribeUsers = onValue(
      usersRef, 
      (snapshot) => {
        const data = snapshot.val() || {};
        const userList = Object.keys(data).map((key) => ({
          uid: data[key].uid,
          timestamp: data[key].timestamp || Date.now(),
          status: data[key].status || 'active'
        }));
        
        // Sort by most recent activity
        userList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setOnlineUsers(userList);
      },
      (error) => {
        console.error('Users presence error:', error);
        setConnectionError(true);
      }
    );

    return () => {
      unsubscribeConnected();
      unsubscribeUsers();
      remove(presenceRef);
    };
  }, [user, noteId]);

  if (isInitializing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Initializing presence...</span>
        </div>
      </div>
    );
  }

  if (!noteId) {
    return (
      <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-6 text-center">
        <Globe className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Select a note to see who's online</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Live Presence</h3>
              <p className="text-xs text-gray-600">
                {onlineUsers.length} {onlineUsers.length === 1 ? 'user' : 'users'} online
              </p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {connectionError ? (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-600 font-medium">Error</span>
              </>
            ) : isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-600 font-medium">Connected</span>
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                <span className="text-xs text-yellow-600 font-medium">Connecting...</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="p-4">
        {connectionError ? (
          <div className="text-center py-6">
            <WifiOff className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-600 text-sm font-medium">Connection Error</p>
            <p className="text-red-500 text-xs">Unable to load presence data</p>
          </div>
        ) : onlineUsers.length > 0 ? (
          <div className="space-y-3">
            {onlineUsers.map((userInfo) => (
              <div key={userInfo.uid} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                {/* Avatar */}
                <div className="relative">
                  <div className={`w-10 h-10 ${generateUserColor(userInfo.uid)} rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                    {getUserInitials(userInfo.uid)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                
                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {formatUserId(userInfo.uid)}
                    </p>
                    {userInfo.uid === user?.uid && (
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Eye className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-gray-500">Viewing this note</span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">Active</span>
                </div>
              </div>
            ))}
            
            {/* Summary */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <UserCheck className="w-4 h-4" />
                <span>
                  {onlineUsers.length > 1 
                    ? `${onlineUsers.length} people are collaborating` 
                    : 'You are the only one here'
                  }
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="p-3 bg-gray-100 rounded-full w-fit mx-auto mb-3">
              <User className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium text-sm mb-1">No one else is here</p>
            <p className="text-gray-400 text-xs">Share this note to collaborate in real-time</p>
          </div>
        )}
      </div>
    </div>
  );
}
