module 8e9187b49143e6071d8bdee63e34224a8e79fdaa6207d2d2ed54007c45936e0b::aya {
    use sui::option;
    use sui::coin;
    use sui::transfer;
    use sui::tx_context;
    use sui::url;

    // Define the `AYA` struct with the `drop` ability
    struct AYA has drop {
        dummy_field: bool
    }

    // Initialize the AYA currency
    public entry fun init(aya: AYA, ctx: &mut tx_context::TxContext) {
        let decimals = 6u8;
        let symbol = b"AYA";
        let name = b"Aya Asagiri";
        let description = b"Aya Asagiri - an Iconic Meme and Character from Magical Girl Site - Tears are Water, Manga is Japanese, Sui is Japanese for Water";
        let icon_url = url::new_unsafe_from_bytes(
            b"https://api.movepump.com/uploads/aya_with_sui_tear_aa38eb3d00.png"
        );

        let metadata = option::some(icon_url);
        let (treasury_cap, coin_metadata) = coin::create_currency<AYA>(
            aya, decimals, symbol, name, description, metadata, ctx
        );

        // Transfer ownership of treasury_cap to the sender
        let sender_address = tx_context::sender(ctx);
        transfer::public_transfer(treasury_cap, sender_address);

        // Share the CoinMetadata publicly
        transfer::public_share_object(coin_metadata);
    }
}
