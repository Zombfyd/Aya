module 0x8e9187b49143e6071d8bdee63e34224a8e79fdaa6207d2d2ed54007c45936e0b::aya {
    use 0x1::option;
    use 0x2::coin;
    use 0x2::transfer;
    use 0x2::tx_context;
    use 0x2::url;

    struct AYA has drop {
        dummy_field: bool,
    }

    public entry fun init(arg0: AYA, arg1: &mut tx_context::TxContext) {
        let decimals = 6u8;
        let symbol = b"AYA";
        let name = b"Aya Asagiri";
        let description = x"4179612041736167697269202d20616e2049636f6e6963204d656d6520616e64204368617261637465722066726f6d204d61676963616c204769726c2053697465202d205465617273206172652057617465722c204d616e6761206973204a6170616e6573652c20537569206973204a6170616e65736520666f72205761746572200a";
        let icon_url = url::new_unsafe_from_bytes(b"https://api.movepump.com/uploads/aya_with_sui_tear_aa38eb3d00.png");

        let metadata = option::some(icon_url);

        let (treasury_cap, coin_metadata) = coin::create_currency<AYA>(
            arg0, decimals, symbol, name, description, metadata, arg1
        );

        transfer::public_transfer(treasury_cap, tx_context::sender(arg1));
        transfer::public_share_object(coin_metadata);
    }
}
