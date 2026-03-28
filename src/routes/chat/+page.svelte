	onDestroy(async () => {
		if (_storeUnsub) _storeUnsub();
		if (_cleanupHandlers) _cleanupHandlers();
		await offSocketEvent('receive_message', handleGlobalMessage);
		await offSocketEvent('typing', handleGlobalTyping);
		await offSocketEvent('stop_typing', handleGlobalStopTyping);
		await offSocketEvent('new_user', handleNewUser);
		await offSocketEvent('user_online');
		await offSocketEvent('user_offline');
		await offSocketEvent('group_joined', handleGroupJoined);
		await offSocketEvent('online_users');
		disconnectSocket();
		// Bug #4 fix: reset store saat komponen destroy
		// Tanpa ini, user B yang login setelah user A akan melihat
		// data milik user A karena conversationsLoaded masih true
		// dan messagesCache masih berisi pesan milik user A
		conversationsLoaded.set(false);
		conversationsStore.set([]);
		messagesCache.set({});
	});